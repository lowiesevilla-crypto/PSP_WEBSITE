import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const textField = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value === "" ? null : value);
const requiredName = z.string().trim().min(1).max(100).optional();
const dateField = z.string().trim().nullable().optional().transform((value, context) => {
  if (!value) return value === undefined ? undefined : null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    context.addIssue({ code: "custom", message: "Invalid date." });
    return z.NEVER;
  }
  return date;
});

const editSchema = z.object({
  firstName: requiredName,
  lastName: requiredName,
  middleInitial: textField(5),
  address: textField(500),
  mobile: textField(30),
  dateSurvive: dateField,
  surviveLocation: textField(500),
  pspBirthdayCode: textField(100),
  birthDate: dateField,
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "At least one editable member field is required.",
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      chapterId: true,
      membershipNo: true,
      membershipStatus: true,
      firstName: true,
      lastName: true,
      middleInitial: true,
    },
  });
  if (!member) return NextResponse.json({ message: "Member not found." }, { status: 404 });
  if (member.membershipStatus === "ARCHIVED") {
    return NextResponse.json({ message: "Archived member records cannot be edited from the active Member Directory." }, { status: 409 });
  }

  try {
    const context = await requirePermission("members.manage", member.chapterId);
    const parsed = editSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the member information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const changes = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
    const firstName = typeof changes.firstName === "string" ? changes.firstName : member.firstName;
    const lastName = typeof changes.lastName === "string" ? changes.lastName : member.lastName;
    const middleInitial = Object.prototype.hasOwnProperty.call(changes, "middleInitial")
      ? (changes.middleInitial as string | null)
      : member.middleInitial;
    const displayName = [firstName, middleInitial, lastName].filter(Boolean).join(" ");
    const changedFields = Object.keys(changes);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.member.update({
        where: { id: member.id },
        data: changes,
        select: {
          id: true,
          membershipNo: true,
          firstName: true,
          lastName: true,
          middleInitial: true,
          address: true,
          mobile: true,
          dateSurvive: true,
          surviveLocation: true,
          pspBirthdayCode: true,
          birthDate: true,
          updatedAt: true,
        },
      });
      if (changedFields.some((field) => ["firstName", "lastName", "middleInitial"].includes(field))) {
        await tx.user.update({ where: { id: member.userId }, data: { displayName } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "MEMBER_PROFILE_UPDATED_ADMIN",
          entityType: "Member",
          entityId: member.id,
          metadataJson: {
            membershipNo: member.membershipNo,
            changedFields,
            protectedFieldsUnchanged: ["chapterId", "membershipNo", "loginEmail"],
          },
        },
      });
      return result;
    });

    return NextResponse.json(
      { member: updated, message: "Member information updated." },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      chapterId: true,
      membershipNo: true,
      membershipStatus: true,
      user: { select: { status: true } },
    },
  });

  if (!member) {
    return NextResponse.json({ message: "Member not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("members.manage", member.chapterId);

    if (context.user.id === member.userId) {
      return NextResponse.json(
        { message: "You cannot delete your own membership while signed in as an administrator." },
        { status: 409 },
      );
    }

    if (member.membershipStatus === "ARCHIVED") {
      return NextResponse.json(
        { message: "This member has already been deleted from active membership and archived." },
        { status: 409 },
      );
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const outsideAssignments = await tx.userRoleAssignment.count({
        where: {
          userId: member.userId,
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          AND: [
            {
              OR: [
                { chapterId: null },
                { chapterId: { not: member.chapterId } },
              ],
            },
          ],
        },
      });

      await tx.membershipHistory.updateMany({
        where: { memberId: member.id, effectiveTo: null },
        data: { effectiveTo: now },
      });

      await tx.membershipHistory.create({
        data: {
          memberId: member.id,
          chapterId: member.chapterId,
          status: "ARCHIVED",
          effectiveFrom: now,
          reason: "Deleted from active membership by an authorized administrator",
        },
      });

      await tx.officerAssignment.updateMany({
        where: { memberId: member.id, endsAt: null },
        data: { endsAt: now },
      });

      await tx.committeeMembership.updateMany({
        where: { memberId: member.id, endsAt: null },
        data: { endsAt: now },
      });

      await tx.userRoleAssignment.updateMany({
        where: { userId: member.userId, chapterId: member.chapterId, endsAt: null },
        data: { endsAt: now },
      });

      const certificateUpdate = await tx.certificate.updateMany({
        where: { memberId: member.id, status: "VALID" },
        data: {
          status: "REVOKED",
          revokedAt: now,
          revocationReason: "Membership deleted/archived by an authorized administrator",
        },
      });

      const digitalIdUpdate = await tx.digitalMemberId.updateMany({
        where: { memberId: member.id },
        data: { status: "REVOKED", revokedAt: now },
      });

      const archivedMember = await tx.member.update({
        where: { id: member.id },
        data: { membershipStatus: "ARCHIVED" },
      });

      const disableWholeUser = outsideAssignments === 0;
      if (disableWholeUser) {
        await tx.user.update({
          where: { id: member.userId },
          data: { status: "DISABLED" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "MEMBER_DELETED_ARCHIVED",
          entityType: "Member",
          entityId: member.id,
          beforeJson: {
            membershipStatus: member.membershipStatus,
            userStatus: member.user.status,
          },
          afterJson: {
            membershipStatus: archivedMember.membershipStatus,
            userAccessDisabled: disableWholeUser,
            certificatesRevoked: certificateUpdate.count,
            digitalMemberIdsRevoked: digitalIdUpdate.count,
            chapterAssignmentsEnded: true,
          },
          metadataJson: {
            membershipNo: member.membershipNo,
            preservationMode: "NON_DESTRUCTIVE_ARCHIVE",
          },
        },
      });

      return {
        disableWholeUser,
        certificatesRevoked: certificateUpdate.count,
        digitalMemberIdsRevoked: digitalIdUpdate.count,
      };
    });

    return NextResponse.json(
      {
        message:
          "Member deleted from active membership. Access was removed and membership, financial, certificate, and audit history were preserved.",
        archived: true,
        userAccessDisabled: result.disableWholeUser,
        certificatesRevoked: result.certificatesRevoked,
        digitalMemberIdsRevoked: result.digitalMemberIdsRevoked,
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
