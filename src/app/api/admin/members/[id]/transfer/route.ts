import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  targetChapterId: z.string().trim().min(1).max(191),
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: memberId } = await params;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { chapter: { select: { id: true, name: true } } },
  });
  if (!member) {
    return NextResponse.json({ message: "Member not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid transfer request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Target chapter and transfer reason are required.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { targetChapterId, reason } = parsed.data;
  if (targetChapterId === member.chapterId) {
    return NextResponse.json({ message: "Member is already assigned to that chapter." }, { status: 409 });
  }

  try {
    const context = await requirePermission("members.manage", member.chapterId);
    await requirePermission("members.manage", targetChapterId);

    const target = await prisma.chapters.findUnique({
      where: { id: targetChapterId },
      select: { id: true, name: true, status: true },
    });
    if (!target || target.status !== "ACTIVE") {
      return NextResponse.json({ message: "Target chapter is not active or does not exist." }, { status: 400 });
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      await tx.membershipHistory.updateMany({
        where: { memberId, effectiveTo: null },
        data: { effectiveTo: now },
      });

      await tx.officerAssignment.updateMany({
        where: {
          memberId,
          endsAt: null,
          position: { chapterId: member.chapterId },
        },
        data: { endsAt: now },
      });

      const memberRole = await tx.role.findUnique({ where: { code: "MEMBER" } });
      if (!memberRole) throw new Error("MEMBER role is not initialized.");

      await tx.userRoleAssignment.updateMany({
        where: {
          userId: member.userId,
          roleId: memberRole.id,
          chapterId: member.chapterId,
          endsAt: null,
        },
        data: { endsAt: now },
      });

      await tx.userRoleAssignment.create({
        data: {
          userId: member.userId,
          roleId: memberRole.id,
          chapterId: targetChapterId,
          startsAt: now,
        },
      });

      const updated = await tx.member.update({
        where: { id: memberId },
        data: {
          chapterId: targetChapterId,
          membershipStatus: "ACTIVE",
        },
      });

      await tx.membershipHistory.create({
        data: {
          memberId,
          chapterId: targetChapterId,
          status: "ACTIVE",
          effectiveFrom: now,
          reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: targetChapterId,
          action: "MEMBER_CHAPTER_TRANSFERRED",
          entityType: "Member",
          entityId: memberId,
          beforeJson: { chapterId: member.chapterId, chapterName: member.chapter.name },
          afterJson: { chapterId: targetChapterId, chapterName: target.name, reason },
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        member: { id: result.id, chapterId: result.chapterId },
        message: `Member transferred to ${target.name}.`,
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
