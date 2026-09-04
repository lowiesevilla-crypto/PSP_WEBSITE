import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { amountToCentavos } from "@/lib/paymongo/client";
import { getChapterPayMongoConfigByCode } from "@/lib/paymongo/chapter-config";
import { parsePayMongoCheckoutPaidEvent, verifyPayMongoSignature } from "@/lib/paymongo/webhook";
import { notifyUser } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chapterCode: string }> },
) {
  const { chapterCode } = await params;
  let config;
  try {
    config = await getChapterPayMongoConfigByCode(chapterCode);
  } catch {
    return NextResponse.json({ message: "Chapter payment webhook is unavailable." }, { status: 404 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paymongo-signature");
  if (!verifyPayMongoSignature({
    rawBody,
    signatureHeader,
    webhookSecret: config.webhookSecret,
    mode: config.mode,
  })) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid webhook JSON." }, { status: 400 });
  }

  const event = parsePayMongoCheckoutPaidEvent(payload);
  if (!event) return NextResponse.json({ received: true, ignored: true });

  const existingEvent = await prisma.paymentTransaction.findUnique({
    where: { gatewayEventId: event.eventId },
    select: { id: true },
  });
  if (existingEvent) return NextResponse.json({ received: true, duplicate: true });

  const payment = await prisma.payment.findUnique({
    where: { internalReference: event.referenceNumber },
    include: {
      chapter: { select: { code: true } },
      member: { select: { userId: true, membershipNo: true } },
      receipt: { select: { receiptNumber: true } },
    },
  });
  if (!payment || payment.gateway !== "PAYMONGO" || payment.chapterId !== config.chapterId) {
    return NextResponse.json({ message: "Payment reference not found for this chapter." }, { status: 404 });
  }
  if (payment.gatewayReference && payment.gatewayReference !== event.sessionId) {
    return NextResponse.json({ message: "Checkout session does not match the internal payment." }, { status: 409 });
  }
  if (event.amount !== null && event.amount !== amountToCentavos(payment.amount)) {
    await prisma.auditLog.create({
      data: {
        chapterId: payment.chapterId,
        action: "PAYMONGO_AMOUNT_MISMATCH",
        entityType: "Payment",
        entityId: payment.id,
        metadataJson: { expectedCentavos: amountToCentavos(payment.amount), receivedCentavos: event.amount, eventId: event.eventId },
      },
    });
    return NextResponse.json({ message: "Payment amount mismatch." }, { status: 422 });
  }

  const payloadHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const paidAt = new Date();
  const receiptNumber = `PSP-${payment.chapter.code}-${paidAt.getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.paymentTransaction.findUnique({ where: { gatewayEventId: event.eventId } });
    if (duplicate) return { duplicate: true as const, receiptNumber: payment.receipt?.receiptNumber ?? null };

    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gatewayEventId: event.eventId,
        gatewayObjectId: event.paymentId ?? event.sessionId,
        eventType: event.eventType,
        rawStatus: event.paymentStatus ?? "paid",
        payloadHash,
        processedAt: paidAt,
      },
    });

    if (payment.status !== "PAID") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt, gatewayReference: event.sessionId },
      });

      if (payment.assessmentId) {
        const existingLedger = await tx.memberLedgerEntry.findFirst({
          where: { paymentId: payment.id, type: "PAYMENT" },
          select: { id: true },
        });
        if (!existingLedger) {
          await tx.memberLedgerEntry.create({
            data: {
              chapterId: payment.chapterId,
              memberId: payment.memberId,
              assessmentId: payment.assessmentId,
              paymentId: payment.id,
              type: "PAYMENT",
              amount: payment.amount,
              reference: payment.internalReference,
              description: `${payment.category} · ${payment.description ?? "PayMongo online payment"}`,
              occurredAt: paidAt,
            },
          });
        }
      }

      await tx.receipt.upsert({
        where: { paymentId: payment.id },
        update: {},
        create: { paymentId: payment.id, receiptNumber, issuedAt: paidAt },
      });

      await tx.auditLog.create({
        data: {
          chapterId: payment.chapterId,
          action: "PAYMONGO_PAYMENT_POSTED",
          entityType: "Payment",
          entityId: payment.id,
          metadataJson: {
            eventId: event.eventId,
            checkoutSessionId: event.sessionId,
            gatewayPaymentId: event.paymentId,
            internalReference: payment.internalReference,
            amount: payment.amount.toFixed(2),
            category: payment.category,
            receiptNumber,
            chapterWebhook: chapterCode,
          },
        },
      });
    }

    const receipt = await tx.receipt.findUnique({ where: { paymentId: payment.id } });
    return { duplicate: false as const, receiptNumber: receipt?.receiptNumber ?? receiptNumber };
  });

  if (!result.duplicate) {
    await notifyUser({
      userId: payment.member.userId,
      type: "PAYMENT",
      title: "Payment confirmed",
      body: `Your ${payment.category.toLowerCase()} payment of ₱${payment.amount.toFixed(2)} has been confirmed. Receipt ${result.receiptNumber}.`,
      href: "/payments",
    });
  }

  return NextResponse.json({ received: true, duplicate: result.duplicate });
}
