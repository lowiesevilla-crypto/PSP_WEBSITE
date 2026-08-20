import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const positionSchema = z.object({
  action: z.literal("POSITION"),
  chapterId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, "_")),
  level: z.number().int().min(0).max(100).default(0),
});

const officerSchema = z.object({
  action: z.literal("OFFICER"),
  chapterId: z.string().min(1),
  positionId: z.string().min(1),
  memberId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
});

const committeeSchema = z.object({
  action: z.literal("COMMITTEE"),
  chapterId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, "_")),
  description: z.string().trim().max(1000).optional().nullable(),
});

const committeeMemberSchema = z.object({
  action: z.literal("COMMITTEE_MEMBER"),
  chapterId: z.string().min(1),
  committeeId: z.string().min(1),
  memberId: z.string().min(1),
  roleLabel: z.string().trim().max(120).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
});

const schema = z.discriminatedUnion("action", [positionSchema, officerSchema, committeeSchema, committeeMemberSchema]);

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid organization request." }, { status: 400 });
    const input = parsed.data;

    if (!hasPermission(context, "members.manage", input.chapterId) && !hasPermission(context, "chapters.manage", input.chapterId)) {
      return NextResponse.json({ message: "Chapter organization permission is required." }, { status: 403 });
    }

    let entityId: string;
    let result: unknown;

    if (input.action === "POSITION") {
      const position = await prisma.chapterPosition.create({
        data: { chapterId: input.chapterId, name: input.name, code: input.code, level: input.level },
      });
      entityId = position.id;
      result = position;
    } else if (input.action === "OFFICER") {
      const [member, position] = await Promise.all([
        prisma.member.findFirst({ where: { id: input.memberId, chapterId: input.chapterId, membershipStatus: "ACTIVE" } }),
        prisma.chapterPosition.findFirst({ where: { id: input.positionId, chapterId: input.chapterId, isActive: true } }),
      ]);
      if (!member || !position) return NextResponse.json({ message: "Member or position is outside the selected chapter." }, { status: 400 });
      const startsAt = new Date(input.startsAt);
      const endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && endsAt <= startsAt) return NextResponse.json({ message: "Officer term end must be after start." }, { status: 400 });
      const assignment = await prisma.officerAssignment.create({ data: { memberId: member.id, positionId: position.id, startsAt, endsAt } });
      entityId = assignment.id;
      result = assignment;
    } else if (input.action === "COMMITTEE") {
      const committee = await prisma.committee.create({ data: { chapterId: input.chapterId, name: input.name, code: input.code, description: input.description || null } });
      entityId = committee.id;
      result = committee;
    } else {
      const [member, committee] = await Promise.all([
        prisma.member.findFirst({ where: { id: input.memberId, chapterId: input.chapterId, membershipStatus: "ACTIVE" } }),
        prisma.committee.findFirst({ where: { id: input.committeeId, chapterId: input.chapterId, isActive: true } }),
      ]);
      if (!member || !committee) return NextResponse.json({ message: "Member or committee is outside the selected chapter." }, { status: 400 });
      const startsAt = new Date(input.startsAt);
      const endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && endsAt <= startsAt) return NextResponse.json({ message: "Committee term end must be after start." }, { status: 400 });
      const membership = await prisma.committeeMembership.create({ data: { committeeId: committee.id, memberId: member.id, roleLabel: input.roleLabel || null, startsAt, endsAt } });
      entityId = membership.id;
      result = membership;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: context.user.id,
        chapterId: input.chapterId,
        action: `CHAPTER_ORGANIZATION_${input.action}_CREATED`,
        entityType: input.action,
        entityId,
      },
    });

    return NextResponse.json({ result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chapter organization error", error);
    return NextResponse.json({ message: "Unable to update chapter organization." }, { status: 500 });
  }
}
