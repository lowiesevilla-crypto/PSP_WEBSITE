import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applicationUrl,
  createPasswordResetToken,
} from "@/lib/auth/account-tokens";
import { escapeHtml, sendEmail } from "@/lib/email/mailer";
import {
  enforceRateLimit,
  rateLimitIdentifier,
  RateLimitExceededError,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

const genericMessage =
  "If an eligible account exists for that email address, password reset instructions will be sent.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: genericMessage }, { status: 202 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: genericMessage }, { status: 202 });
  }

  const email = parsed.data.email;
  const identifier = rateLimitIdentifier("password-reset-email", email);

  try {
    await enforceRateLimit({
      action: "PASSWORD_RESET_REQUESTED",
      identifier,
      maxAttempts: 3,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { message: genericMessage },
        { status: 202, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  await recordRateLimitAttempt("PASSWORD_RESET_REQUESTED", identifier);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  });

  if (user?.status === "ACTIVE" && user.emailVerifiedAt && user.passwordHash) {
    const token = createPasswordResetToken(user);
    const resetUrl = applicationUrl(`/reset-password?token=${encodeURIComponent(token)}`);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Psi Sigma Phi account password",
        text: `Hello ${user.displayName},\n\nUse this secure link to reset your password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Hello ${escapeHtml(user.displayName)},</p><p>Use the secure link below to reset your Psi Sigma Phi account password.</p><p><a href="${escapeHtml(resetUrl)}">Reset Password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "PASSWORD_RESET_EMAIL_SENT",
          entityType: "User",
          entityId: user.id,
        },
      });
    } catch {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "PASSWORD_RESET_EMAIL_FAILED",
          entityType: "User",
          entityId: user.id,
        },
      });
    }
  }

  return NextResponse.json(
    { message: genericMessage },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
