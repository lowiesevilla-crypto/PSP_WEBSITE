import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  passwordFingerprint,
  signToken,
  verifyToken,
} from "@/lib/security/tokens";

export const SESSION_COOKIE_NAME = "psp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function createSessionToken(userId: string, passwordHash: string) {
  const now = Date.now();
  return signToken({
    purpose: "session",
    userId,
    passwordFingerprint: passwordFingerprint(passwordHash) ?? undefined,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token, "session");
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

  if (!user || user.status !== "ACTIVE" || !user.passwordHash) return null;

  const currentFingerprint = passwordFingerprint(user.passwordHash);
  if (!currentFingerprint || currentFingerprint !== payload.passwordFingerprint) {
    return null;
  }

  return user;
}
