import { NextResponse } from "next/server";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import {
  memberNeedsActivation,
  sendMemberInvitationEmail,
} from "@/lib/member/invitation";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  rateLimitIdentifier,
  RateLimitExceededError,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          emailVerifiedAt: true,
          passwordHash: true,
        },
      },
      chapter: { select: { id: true, name: true, email: true } },
    },
  });

  if (!member) {
    return NextResponse.json({ message: "Member not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("members.manage", member.chapterId);

    if (member.membershipStatus !== "ACTIVE") {
      return NextResponse.json(
        { message: "Only active approved memberships can receive an activation invitation." },
        { status: 409 },
      );
    }

    if (member.user.status === "SUSPENDED" || member.user.status === "DISABLED") {
      return NextResponse.json(
        { message: "Suspended or disabled user accounts cannot receive an activation invitation." },
        { status: 409 },
      );
    }

    if (!memberNeedsActivation(member.user)) {
      return NextResponse.json(
        { message: "This member account is already activated. Use Forgot Password if password recovery is needed." },
        { status: 409 },
      );
    }

    const identifier = rateLimitIdentifier("member-invitation-resend", member.id);
    try {
      await enforceRateLimit({
        action: "MEMBER_INVITATION_RESEND_REQUESTED",
        identifier,
        maxAttempts: 5,
        windowSeconds: 15 * 60,
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return NextResponse.json(
          { message: "Too many invitation resends. Please try again later." },
          { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
        );
      }
      throw error;
    }

    await recordRateLimitAttempt("MEMBER_INVITATION_RESEND_REQUESTED", identifier, {
      memberId: member.id,
      actorUserId: context.user.id,
    });

    try {
      await sendMemberInvitationEmail({
        user: member.user,
        member: { membershipNo: member.membershipNo },
        chapter: member.chapter,
        mode: "resend",
      });
    } catch {
      await prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "MEMBER_INVITATION_EMAIL_FAILED",
          entityType: "Member",
          entityId: member.id,
          metadataJson: { email: member.user.email },
        },
      });
      return NextResponse.json(
        { message: "Invitation email could not be delivered. Please verify SMTP and the member email address." },
        { status: 502 },
      );
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: context.user.id,
        chapterId: member.chapterId,
        action: "MEMBER_INVITATION_EMAIL_SENT",
        entityType: "Member",
        entityId: member.id,
        metadataJson: { email: member.user.email },
      },
    });

    return NextResponse.json(
      {
        message: `A new activation invitation was sent to ${member.user.email}.`,
        activationRequired: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationDeniedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    throw error;
  }
}
