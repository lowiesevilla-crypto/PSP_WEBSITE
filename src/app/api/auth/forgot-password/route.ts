import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applicationUrl,
  createPasswordResetToken,
} from "@/lib/auth/account-tokens";
import { chapterLogoPublicPath } from "@/lib/chapter/logo";
import {
  emailActionButton,
  emailInfoCard,
  escapeHtml,
  sendEmail,
} from "@/lib/email/mailer";
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
      member: {
        select: {
          membershipNo: true,
          chapter: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (user?.status === "ACTIVE" && user.emailVerifiedAt && user.passwordHash) {
    const token = createPasswordResetToken(user);
    const resetUrl = applicationUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    const chapter = user.member?.chapter ?? null;
    const accountDetails = emailInfoCard([
      { label: "Account Email", value: user.email },
      ...(user.member?.membershipNo
        ? [{ label: "Membership No.", value: user.member.membershipNo }]
        : []),
      ...(chapter?.name ? [{ label: "Chapter", value: chapter.name }] : []),
    ]);

    try {
      await sendEmail({
        to: user.email,
        replyTo: chapter?.email,
        subject: "Reset your Psi Sigma Phi account password",
        preheader: "Use the secure PSP link to reset your account password. This link expires in 30 minutes.",
        brand: chapter
          ? {
              chapterName: chapter.name,
              chapterLogoUrl: chapterLogoPublicPath(chapter.id, chapter.logoUrl),
            }
          : undefined,
        text: `Hello ${user.displayName},\n\nUse this secure link to reset your Psi Sigma Phi account password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
        html: `<p style="margin-top:0;">Hello <strong>${escapeHtml(user.displayName)}</strong>,</p><p>We received a request to reset your Psi Sigma Phi account password.</p>${accountDetails}${emailActionButton("Reset PSP Password", resetUrl)}<p style="margin:0 0 12px;color:#5f5a51;">This secure link expires in <strong>30 minutes</strong>.</p><p style="margin:0;color:#6c665c;font-size:13px;">If you did not request a password reset, you can safely ignore this email. Your existing password will remain unchanged.</p>`,
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
