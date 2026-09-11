import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { passwordFingerprint, signToken, verifyToken } from "@/lib/security/tokens";

export const TEMPORARY_PASSWORD_COOKIE_NAME = "psp_temp_password";
export const TEMPORARY_PASSWORD_TTL_SECONDS = 30 * 60;

export function temporaryPasswordCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TEMPORARY_PASSWORD_TTL_SECONDS,
  };
}

export function createTemporaryPasswordToken(userId: string, passwordHash: string) {
  const now = Date.now();
  return signToken({
    purpose: "temporary-password-change",
    userId,
    passwordFingerprint: passwordFingerprint(passwordHash) ?? undefined,
    issuedAt: now,
    expiresAt: now + TEMPORARY_PASSWORD_TTL_SECONDS * 1000,
  });
}

export async function getTemporaryPasswordUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEMPORARY_PASSWORD_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token, "temporary-password-change");
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      passwordHash: true,
      emailVerifiedAt: true,
      member: {
        select: {
          id: true,
          chapterId: true,
          membershipNo: true,
          membershipStatus: true,
        },
      },
    },
  });

  if (!user || user.status !== "INVITED" || !user.passwordHash || user.member?.membershipStatus !== "ACTIVE") {
    return null;
  }

  const currentFingerprint = passwordFingerprint(user.passwordHash);
  if (!currentFingerprint || currentFingerprint !== payload.passwordFingerprint) return null;

  return user;
}
