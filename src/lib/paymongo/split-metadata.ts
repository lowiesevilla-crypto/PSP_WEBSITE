import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SPLIT_PAYMENT_AUDIT_ACTION = "PAYMONGO_SPLIT_PAYMENT_INTENT_CREATED";

export type PersistedSplitAmounts = {
  chapterAmount: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  chapterAmountCentavos: number;
  platformFeeCentavos: number;
  totalAmountCentavos: number;
  paymentMethod: string | null;
};

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function splitAmountsFromMetadata(metadata: unknown, fallbackChapterAmount: Prisma.Decimal): PersistedSplitAmounts {
  const record = objectValue(metadata);
  const fallbackCentavos = fallbackChapterAmount.mul(100).toNumber();
  const chapterAmountCentavos = integer(record?.chapterAmountCentavos) ?? fallbackCentavos;
  const platformFeeCentavos = integer(record?.platformFeeCentavos) ?? 0;
  const totalAmountCentavos = integer(record?.totalAmountCentavos) ?? (chapterAmountCentavos + platformFeeCentavos);

  return {
    chapterAmount: new Prisma.Decimal(chapterAmountCentavos).div(100),
    platformFee: new Prisma.Decimal(platformFeeCentavos).div(100),
    totalAmount: new Prisma.Decimal(totalAmountCentavos).div(100),
    chapterAmountCentavos,
    platformFeeCentavos,
    totalAmountCentavos,
    paymentMethod: stringValue(record?.paymentMethod),
  };
}

export async function getPersistedSplitAmounts(paymentId: string, fallbackChapterAmount: Prisma.Decimal) {
  const audit = await prisma.auditLog.findFirst({
    where: {
      entityType: "Payment",
      entityId: paymentId,
      action: SPLIT_PAYMENT_AUDIT_ACTION,
    },
    orderBy: { createdAt: "desc" },
    select: { metadataJson: true },
  });
  return splitAmountsFromMetadata(audit?.metadataJson, fallbackChapterAmount);
}
