import { NextResponse } from "next/server";
import { Prisma, PaymentCategory } from "@prisma/client";
import { z } from "zod";
import { getAssessmentOutstanding } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
import { getChapterPayMongoConfig } from "@/lib/paymongo/chapter-config";
import {
  attachLinkedPaymentMethod,
  createLinkedPaymentMethod,
  createLinkedSplitPaymentIntent,
  type LinkedPaymentMethod,
} from "@/lib/paymongo/client";
import {
  calculatePlatformConvenienceFee,
  getPlatformPayMongoConfig,
} from "@/lib/paymongo/platform-config";
import { SPLIT_PAYMENT_AUDIT_ACTION } from "@/lib/paymongo/split-metadata";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  category: z.enum(["DUES", "CONTRIBUTION", "OTHER"]),
  paymentMethod: z.enum(["qrph", "gcash", "paymaya"]),
  assessmentId: z.string().min(1).optional(),
  requestId: z.string().uuid(),
  amount: z.coerce.number().positive().max(10000000).optional(),
  description: z.string().trim().min(3).max(255).optional(),
});

const DUES_CODES = new Set(["MONTHLY_DUES", "NATIONAL_DUES", "MEMBERSHIP_FEE"]);
const CONTRIBUTION_CODES = new Set(["SPECIAL_ASSESSMENT", "EVENT_CONTRIBUTION", "DONATION"]);

function categoryForAssessment(code: string): PaymentCategory {
  if (DUES_CODES.has(code)) return PaymentCategory.DUES;
  if (CONTRIBUTION_CODES.has(code)) return PaymentCategory.CONTRIBUTION;
  return PaymentCategory.OTHER;
}

type CheckoutAssessment = {
  id: string;
  title: string;
  assessmentType: { code: string };
};

function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!configured) throw new Error("Application URL is not configured.");
  return configured;
}

export async function POST(request: Request) {
  let paymentId: string | null = null;

  try {
    const { context, member } = await requireCurrentMember();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payment request." }, { status: 400 });
    }

    const input = parsed.data;
    const [chapterGateway, platformGateway] = await Promise.all([
      getChapterPayMongoConfig(member.chapterId),
      Promise.resolve(getPlatformPayMongoConfig()),
    ]);
    if (chapterGateway.mode !== platformGateway.mode) {
      return NextResponse.json({ message: "Chapter and platform PayMongo modes do not match." }, { status: 409 });
    }
    if (!chapterGateway.paymentMethods.includes(input.paymentMethod)) {
      return NextResponse.json({ message: "Selected payment method is not enabled for this chapter." }, { status: 400 });
    }

    let assessment: CheckoutAssessment | null = null;
    let requestedAmount: Prisma.Decimal;
    let description: string;

    if (input.assessmentId) {
      assessment = await prisma.assessment.findFirst({
        where: { id: input.assessmentId, chapterId: member.chapterId, status: "ACTIVE" },
        select: { id: true, title: true, assessmentType: { select: { code: true } } },
      });
      if (!assessment) {
        return NextResponse.json({ message: "Assessment is unavailable." }, { status: 404 });
      }

      const expectedCategory = categoryForAssessment(assessment.assessmentType.code);
      if (expectedCategory !== input.category) {
        return NextResponse.json(
          { message: `This assessment must be paid as ${expectedCategory.toLowerCase()}.` },
          { status: 400 },
        );
      }

      const outstanding = await getAssessmentOutstanding(member.id, assessment.id);
      if (outstanding.lte(0)) {
        return NextResponse.json({ message: "This assessment has no outstanding balance." }, { status: 400 });
      }
      requestedAmount = input.amount === undefined
        ? outstanding
        : new Prisma.Decimal(input.amount).toDecimalPlaces(2);
      if (requestedAmount.lte(0) || requestedAmount.gt(outstanding)) {
        return NextResponse.json(
          { message: "Payment amount must be greater than zero and cannot exceed the outstanding balance." },
          { status: 400 },
        );
      }
      description = assessment.title;
    } else {
      if (input.category === "DUES") {
        return NextResponse.json({ message: "Dues payment must reference an active dues assessment." }, { status: 400 });
      }
      if (input.amount === undefined || !input.description) {
        return NextResponse.json(
          { message: "Amount and description are required for contribution or other payment." },
          { status: 400 },
        );
      }
      requestedAmount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
      description = input.description;
    }

    const split = calculatePlatformConvenienceFee(requestedAmount, platformGateway);
    const internalReference = `PSP-${input.requestId}`;
    const existing = await prisma.payment.findUnique({ where: { internalReference } });
    if (existing) {
      return NextResponse.json(
        {
          message: "This payment request was already received. Refresh your payment page before trying again.",
          paymentId: existing.id,
        },
        { status: 409 },
      );
    }

    const payment = await prisma.payment.create({
      data: {
        chapterId: member.chapterId,
        memberId: member.id,
        assessmentId: assessment?.id ?? null,
        internalReference,
        category: input.category,
        description,
        // Payment.amount is intentionally the chapter entitlement only. The
        // separately disclosed platform convenience fee must never inflate a
        // member's chapter ledger, dues, contribution total, or chapter receipt amount.
        amount: requestedAmount,
        currency: "PHP",
        status: "PENDING",
      },
    });
    paymentId = payment.id;

    const intent = await createLinkedSplitPaymentIntent({
      secretKey: platformGateway.secretKey,
      childAccountId: chapterGateway.accountId,
      platformAccountId: platformGateway.platformAccountId,
      baseCentavos: split.baseCentavos,
      platformFeeCentavos: split.feeCentavos,
      grossCentavos: split.grossCentavos,
      description,
      referenceNumber: internalReference,
      memberId: member.id,
      chapterId: member.chapterId,
      paymentCategory: input.category,
      paymentMethod: input.paymentMethod as LinkedPaymentMethod,
      idempotencyKey: internalReference,
    });

    const paymentMethod = await createLinkedPaymentMethod({
      secretKey: platformGateway.secretKey,
      childAccountId: chapterGateway.accountId,
      method: input.paymentMethod as LinkedPaymentMethod,
      billing: {
        name: [member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" "),
        email: member.user.email,
        phone: member.mobile,
      },
    });

    const returnUrl = `${appUrl()}/payments/success?ref=${encodeURIComponent(internalReference)}`;
    const action = await attachLinkedPaymentMethod({
      secretKey: platformGateway.secretKey,
      childAccountId: chapterGateway.accountId,
      paymentIntentId: intent.id,
      paymentMethodId: paymentMethod.id,
      clientKey: intent.clientKey,
      returnUrl,
    });

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayReference: intent.id, status: "PROCESSING" },
      }),
      prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          gatewayObjectId: intent.id,
          eventType: "payment_intent.created",
          rawStatus: action.status,
          processedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: SPLIT_PAYMENT_AUDIT_ACTION,
          entityType: "Payment",
          entityId: payment.id,
          metadataJson: {
            internalReference,
            paymentIntentId: intent.id,
            chapterAmount: requestedAmount.toFixed(2),
            chapterAmountCentavos: split.baseCentavos,
            platformFee: split.feeAmount.toFixed(2),
            platformFeeCentavos: split.feeCentavos,
            totalAmount: split.grossAmount.toFixed(2),
            totalAmountCentavos: split.grossCentavos,
            assessmentId: assessment?.id ?? null,
            category: input.category,
            paymentMethod: input.paymentMethod,
            chapterAccountId: chapterGateway.accountId,
            platformAccountId: platformGateway.platformAccountId,
            gatewayMode: platformGateway.mode,
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        paymentId: payment.id,
        internalReference,
        chapterAmount: requestedAmount.toFixed(2),
        platformFee: split.feeAmount.toFixed(2),
        totalAmount: split.grossAmount.toFixed(2),
        paymentMethod: input.paymentMethod,
        status: action.status,
        actionType: action.actionType,
        actionUrl: action.actionUrl,
        qrImageUrl: action.qrImageUrl,
        testUrl: platformGateway.mode === "TEST" ? action.testUrl : null,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: { in: ["PENDING", "PROCESSING"] } },
        data: { status: "FAILED" },
      }).catch(() => undefined);
    }
    if (
      error instanceof Error &&
      (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")
    ) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("PayMongo split payment error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to start online payment." },
      { status: 502 },
    );
  }
}
