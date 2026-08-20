import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function ledgerSignedAmount(entry: {
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT" | "REFUND" | "REVERSAL";
  amount: Prisma.Decimal;
}) {
  switch (entry.type) {
    case "CHARGE":
      return entry.amount;
    case "PAYMENT":
      return entry.amount.negated();
    case "REFUND":
      return entry.amount;
    case "ADJUSTMENT":
    case "REVERSAL":
      // Adjustments/reversals are explicitly signed when created.
      return entry.amount;
  }
}

export async function getMemberBalance(memberId: string) {
  const entries = await prisma.memberLedgerEntry.findMany({
    where: { memberId },
    select: { type: true, amount: true },
  });

  return entries.reduce(
    (total, entry) => total.plus(ledgerSignedAmount(entry)),
    new Prisma.Decimal(0),
  );
}

export async function getAssessmentOutstanding(memberId: string, assessmentId: string) {
  const entries = await prisma.memberLedgerEntry.findMany({
    where: { memberId, assessmentId },
    select: { type: true, amount: true },
  });

  return entries.reduce(
    (total, entry) => total.plus(ledgerSignedAmount(entry)),
    new Prisma.Decimal(0),
  );
}

export function php(value: Prisma.Decimal | string | number) {
  const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(decimal.toNumber());
}
