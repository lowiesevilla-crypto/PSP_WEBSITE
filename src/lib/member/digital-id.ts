import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://psp.hoahub.tech").replace(/\/$/, "");
}

export function digitalIdVerificationUrl(token: string) {
  return `${appOrigin()}/verify/member/${encodeURIComponent(token)}`;
}

export async function ensureDigitalMemberId(memberId: string) {
  const existing = await prisma.digitalMemberId.findUnique({
    where: { memberId },
  });
  if (existing) return existing;

  return prisma.digitalMemberId.upsert({
    where: { memberId },
    update: {},
    create: {
      memberId,
      verificationToken: randomBytes(24).toString("base64url"),
      status: "VALID",
    },
  });
}
