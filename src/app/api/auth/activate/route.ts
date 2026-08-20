import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyActivationToken } from "@/lib/auth/account-tokens";
import { hashPassword } from "@/lib/security/password";
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
    return NextResponse.json({ message: "Invalid activation request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid or expired activation link." }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const identifier = rateLimitIdentifier("activation", token);

  try {
    await enforceRateLimit({
      action: "AUTH_ACTIVATION_FAILED",
      identifier,
      maxAttempts: 5,
      windowSeconds: 30 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { message: "Too many activation attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const payload = verifyActivationToken(token);
  if (!payload?.email) {
    await recordRateLimitAttempt("AUTH_ACTIVATION_FAILED", identifier, {
      reason: "INVALID_TOKEN",
    });
    return NextResponse.json({ message: "Invalid or expired activation link." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, status: true, emailVerifiedAt: true },
  });

  if (!user || user.email !== payload.email || user.status === "DISABLED" || user.status === "SUSPENDED") {
    await recordRateLimitAttempt("AUTH_ACTIVATION_FAILED", identifier, {
      reason: "USER_UNAVAILABLE",
    });
    return NextResponse.json({ message: "Invalid or expired activation link." }, { status: 400 });
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
      data: {
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "AUTH_ACCOUNT_ACTIVATED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  return NextResponse.json(
    { message: "Your account has been activated. You can now sign in." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
