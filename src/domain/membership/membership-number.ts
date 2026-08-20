import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";

export async function generateMembershipNumber(tx: Prisma.TransactionClient) {
  const configuredPrefix = process.env.MEMBERSHIP_NUMBER_PREFIX?.trim().toUpperCase();
  const prefix = configuredPrefix && /^[A-Z0-9_-]{1,20}$/.test(configuredPrefix)
    ? configuredPrefix
    : "PSP";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = randomInt(0, 10_000_000_000).toString().padStart(10, "0");
    const candidate = `${prefix}-${suffix}`;
    const existing = await tx.member.findUnique({
      where: { membershipNo: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Unable to generate a unique membership number.");
}
