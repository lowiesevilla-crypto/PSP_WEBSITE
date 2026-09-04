import { NextResponse } from "next/server";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

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

      await tx.digitalMemberId.updateMany({
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
            digitalMemberIdRevoked: true,
            chapterAssignmentsEnded: true,
          },
          metadataJson: {
            membershipNo: member.membershipNo,
            preservationMode: "NON_DESTRUCTIVE_ARCHIVE",
          },
        },
      });

      return { disableWholeUser, certificatesRevoked: certificateUpdate.count };
    });

    return NextResponse.json(
      {
        message:
          "Member deleted from active membership. Access was removed and membership, financial, certificate, and audit history were preserved.",
        archived: true,
        userAccessDisabled: result.disableWholeUser,
        certificatesRevoked: result.certificatesRevoked,
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
