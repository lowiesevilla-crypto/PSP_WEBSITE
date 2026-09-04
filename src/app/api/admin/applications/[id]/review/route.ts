import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { generateMembershipNumber } from "@/domain/membership/membership-number";
import { escapeHtml, sendEmail } from "@/lib/email/mailer";
import {
  memberNeedsActivation,
  sendMemberInvitationEmail,
} from "@/lib/member/invitation";
import { notifyUser } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "CORRECTION_REQUIRED",
    "PENDING_REQUIREMENTS",
    "APPROVED",
    "REJECTED",
  ]),
  reviewNotes: z.string().trim().max(3000).optional(),
});

const reviewableStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CORRECTION_REQUIRED",
  "PENDING_REQUIREMENTS",
] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = await prisma.membershipApplication.findUnique({
    where: { id },
    include: {
      chapter: { select: { id: true, name: true, code: true, email: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ message: "Membership application not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("applications.review", application.chapterId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid review request." }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the status and notes.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (!reviewableStatuses.includes(application.status as (typeof reviewableStatuses)[number])) {
      return NextResponse.json(
        { message: `Application cannot be reviewed from status ${application.status}.` },
        { status: 409 },
      );
    }

    const { status, reviewNotes } = parsed.data;

    if (status === "APPROVED") {
      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: application.email },
          include: { member: true },
        });

        if (existingUser?.member) {
          throw new Error("A member record already exists for this email address.");
        }

        const displayName = [application.firstName, application.middleInitial, application.lastName]
          .filter(Boolean)
          .join(" ");

        const user = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                displayName,
                status: existingUser.status === "ACTIVE" ? "ACTIVE" : "INVITED",
              },
            })
          : await tx.user.create({
              data: {
                email: application.email,
                displayName,
                status: "INVITED",
              },
            });

        const membershipNo = await generateMembershipNumber(tx);
        const member = await tx.member.create({
          data: {
            userId: user.id,
            chapterId: application.chapterId,
            membershipNo,
            firstName: application.firstName,
            lastName: application.lastName,
            middleInitial: application.middleInitial,
            address: application.address,
            mobile: application.mobile,
            dateSurvive: application.dateSurvive,
            surviveLocation: application.surviveLocation,
            pspBirthdayCode: application.pspBirthdayCode,
            birthDate: application.birthDate,
            profilePhotoUrl: application.profilePhotoUrl,
            membershipStatus: "ACTIVE",
            joinedAt: application.dateSurvive ?? new Date(),
          },
        });

        await tx.digitalMemberId.create({
          data: {
            memberId: member.id,
            verificationToken: randomBytes(24).toString("base64url"),
            status: "VALID",
          },
        });

        await tx.membershipHistory.create({
          data: {
            memberId: member.id,
            chapterId: application.chapterId,
            status: "ACTIVE",
            effectiveFrom: new Date(),
            reason: "Approved membership application",
          },
        });

        const memberRole = await tx.role.findUnique({ where: { code: "MEMBER" } });
        if (!memberRole) throw new Error("MEMBER role is not initialized.");

        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: memberRole.id,
            chapterId: application.chapterId,
          },
        });

        const updatedApplication = await tx.membershipApplication.update({
          where: { id: application.id },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: application.chapterId,
            action: "MEMBERSHIP_APPLICATION_APPROVED",
            entityType: "MembershipApplication",
            entityId: application.id,
            beforeJson: { status: application.status },
            afterJson: {
              status: updatedApplication.status,
              memberId: member.id,
              membershipNo,
              digitalIdIssued: true,
            },
          },
        });

        return { user, member, updatedApplication };
      });

      const needsActivation = memberNeedsActivation(result.user);
      let welcomeDelivery: "sent" | "failed" = "sent";
      try {
        await sendMemberInvitationEmail({
          user: result.user,
          member: result.member,
          chapter: application.chapter,
          mode: "welcome",
        });
      } catch {
        welcomeDelivery = "failed";
        await prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: application.chapterId,
            action: "MEMBER_WELCOME_EMAIL_FAILED",
            entityType: "Member",
            entityId: result.member.id,
          },
        });
      }

      await notifyUser({
        userId: result.user.id,
        type: "MEMBERSHIP",
        title: "Welcome to Psi Sigma Phi",
        body: `Your ${application.chapter.name} membership is approved. Your membership number is ${result.member.membershipNo}.`,
        href: "/member",
      }).catch(() => undefined);

      return NextResponse.json(
        {
          application: {
            id: result.updatedApplication.id,
            status: result.updatedApplication.status,
          },
          member: {
            id: result.member.id,
            membershipNo: result.member.membershipNo,
          },
          welcomeDelivery,
          activationRequired: needsActivation,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reviewed = await tx.membershipApplication.update({
        where: { id: application.id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: application.chapterId,
          action: `MEMBERSHIP_APPLICATION_${status}`,
          entityType: "MembershipApplication",
          entityId: application.id,
          beforeJson: { status: application.status },
          afterJson: { status, reviewNotes: reviewNotes || null },
        },
      });

      return reviewed;
    });

    if (["CORRECTION_REQUIRED", "PENDING_REQUIREMENTS", "REJECTED"].includes(status)) {
      try {
        const statusLabel = status.replaceAll("_", " ").toLowerCase();
        await sendEmail({
          to: application.email,
          replyTo: application.chapter.email,
          subject: `Psi Sigma Phi membership application update — ${application.chapter.name}`,
          text: `Hello ${application.firstName},\n\nYour membership application status is now ${statusLabel}.\n\n${reviewNotes || "Please contact your chapter for additional information."}`,
          html: `<p>Hello ${escapeHtml(application.firstName)},</p><p>Your membership application status is now <strong>${escapeHtml(statusLabel)}</strong>.</p><p>${escapeHtml(reviewNotes || "Please contact your chapter for additional information.")}</p>`,
        });
      } catch {
        await prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: application.chapterId,
            action: "APPLICATION_STATUS_EMAIL_FAILED",
            entityType: "MembershipApplication",
            entityId: application.id,
          },
        });
      }
    }

    return NextResponse.json(
      { application: { id: updated.id, status: updated.status } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationDeniedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("member record already exists")) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    throw error;
  }
}
