import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getChapterPayMongoConfigByCode } from "@/lib/paymongo/chapter-config";
import { parsePayMongoPaymentEvent, verifyPayMongoSignature } from "@/lib/paymongo/webhook";
import { getPersistedSplitAmounts } from "@/lib/paymongo/split-metadata";
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

  const event = parsePayMongoPaymentEvent(payload);
  if (!event) return NextResponse.json({ received: true, ignored: true });

  const existingEvent = await prisma.paymentTransaction.findUnique({
    where: { gatewayEventId: event.eventId },
    select: { id: true },
  });
  if (existingEvent) return NextResponse.json({ received: true, duplicate: true });

  const payment = await prisma.payment.findFirst({
    where: {
      gatewayReference: event.paymentIntentId,
      chapterId: config.chapterId,
      gateway: "PAYMONGO",
    },
    include: {
      chapter: { select: { code: true } },
      member: { select: { userId: true, membershipNo: true } },
      receipt: { select: { receiptNumber: true } },
    },
  });
  if (!payment) {
    return NextResponse.json({ message: "Payment reference not found for this chapter." }, { status: 404 });
  }

  const split = await getPersistedSplitAmounts(payment.id, payment.amount);
  if (event.amount !== null && event.amount !== split.totalAmountCentavos) {
    await prisma.auditLog.create({
      data: {
        chapterId: payment.chapterId,
        action: "PAYMONGO_SPLIT_AMOUNT_MISMATCH",
        entityType: "Payment",
        entityId: payment.id,
        metadataJson: {
          expectedGrossCentavos: split.totalAmountCentavos,
          receivedCentavos: event.amount,
          chapterAmountCentavos: split.chapterAmountCentavos,
          platformFeeCentavos: split.platformFeeCentavos,
          eventId: event.eventId,
          paymentIntentId: event.paymentIntentId,
        },
      },
    });
    return NextResponse.json({ message: "Payment amount mismatch." }, { status: 422 });
  }

  const payloadHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const processedAt = new Date();

  if (!event.paid) {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.paymentTransaction.findUnique({ where: { gatewayEventId: event.eventId } });
      if (duplicate) return { duplicate: true as const };

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          gatewayEventId: event.eventId,
          gatewayObjectId: event.paymentId,
          eventType: event.eventType,
          rawStatus: event.paymentStatus,
          payloadHash,
          processedAt,
        },
      });

      if (payment.status !== "PAID") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
      }

      await tx.auditLog.create({
        data: {
          chapterId: payment.chapterId,
          action: "PAYMONGO_SPLIT_PAYMENT_FAILED",
          entityType: "Payment",
          entityId: payment.id,
          metadataJson: {
            eventId: event.eventId,
            paymentIntentId: event.paymentIntentId,
            gatewayPaymentId: event.paymentId,
            paymentMethod: event.paymentMethod ?? split.paymentMethod,
            chapterAmount: split.chapterAmount.toFixed(2),
            platformFee: split.platformFee.toFixed(2),
            totalAmount: split.totalAmount.toFixed(2),
          },
        },
      });
      return { duplicate: false as const };
    });

    if (!result.duplicate && payment.status !== "PAID") {
      await notifyUser({
        userId: payment.member.userId,
        type: "PAYMENT",
        title: "Payment was not completed",
        body: `Your ${payment.category.toLowerCase()} payment was not completed. No chapter payment was posted.`,
        href: "/payments",
      });
    }
    return NextResponse.json({ received: true, duplicate: result.duplicate, status: "FAILED" });
  }

  const paidAt = processedAt;
  const receiptNumber = `PSP-${payment.chapter.code}-${paidAt.getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;
  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.paymentTransaction.findUnique({ where: { gatewayEventId: event.eventId } });
    if (duplicate) return { duplicate: true as const, receiptNumber: payment.receipt?.receiptNumber ?? null };

    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gatewayEventId: event.eventId,
        gatewayObjectId: event.paymentId,
        eventType: event.eventType,
        rawStatus: event.paymentStatus,
        payloadHash,
        processedAt: paidAt,
      },
    });

    if (payment.status !== "PAID") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt },
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
              // Chapter ledger gets the chapter entitlement only. Platform
              // convenience fee is settled separately by PayMongo split payment.
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
          action: "PAYMONGO_SPLIT_PAYMENT_POSTED",
          entityType: "Payment",
          entityId: payment.id,
          metadataJson: {
            eventId: event.eventId,
            paymentIntentId: event.paymentIntentId,
            gatewayPaymentId: event.paymentId,
            internalReference: payment.internalReference,
            category: payment.category,
            paymentMethod: event.paymentMethod ?? split.paymentMethod,
            chapterAmount: split.chapterAmount.toFixed(2),
            platformFee: split.platformFee.toFixed(2),
            totalAmount: split.totalAmount.toFixed(2),
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
      body: `Chapter amount ₱${split.chapterAmount.toFixed(2)} plus ₱${split.platformFee.toFixed(2)} platform convenience fee was paid successfully. Total ₱${split.totalAmount.toFixed(2)}. Receipt ${result.receiptNumber}.`,
      href: "/payments/receipts",
    });
  }

  return NextResponse.json({ received: true, duplicate: result.duplicate, status: "PAID" });
}
