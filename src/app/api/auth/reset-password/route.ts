import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPasswordResetToken } from "@/lib/auth/account-tokens";
import { hashPassword } from "@/lib/security/password";
import { passwordFingerprint } from "@/lib/security/tokens";
import {
  enforceRateLimit,
  rateLimitIdentifier,
  RateLimitExceededError,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(20).max(4096),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const identifier = rateLimitIdentifier("password-reset-token", token);

  try {
    await enforceRateLimit({
      action: "PASSWORD_RESET_FAILED",
      identifier,
      maxAttempts: 5,
      windowSeconds: 30 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { message: "Too many attempts. Please request a new reset link." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const payload = verifyPasswordResetToken(token);
  if (!payload?.email) {
    await recordRateLimitAttempt("PASSWORD_RESET_FAILED", identifier, { reason: "INVALID_TOKEN" });
    return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      status: true,
      passwordHash: true,
    },
  });

  if (
    !user ||
    user.email !== payload.email ||
    user.status !== "ACTIVE" ||
    passwordFingerprint(user.passwordHash) !== payload.passwordFingerprint
  ) {
    await recordRateLimitAttempt("PASSWORD_RESET_FAILED", identifier, { reason: "TOKEN_STALE" });
    return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Password does not meet requirements." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  return NextResponse.json(
    { message: "Your password has been reset. Please sign in with your new password." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
