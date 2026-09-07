import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { notifyChapterMembers } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  billingScope: z.enum(["CHAPTER", "NATIONAL"]).optional().default("CHAPTER"),
  chapterId: z.string().min(1).optional().nullable(),
  assessmentTypeCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  amount: z.coerce.number().positive().max(10000000).optional(),
  coverageStart: z.string().datetime().optional().nullable(),
  coverageEnd: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid assessment information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const isNational = input.billingScope === "NATIONAL";
    if (isNational) {
      if (!hasPermission(context, "finance.manage", null)) {
        return NextResponse.json({ message: "National finance management permission is required." }, { status: 403 });
      }
      if (input.assessmentTypeCode !== "NATIONAL_DUES") {
        return NextResponse.json({ message: "National billing must use the National Dues assessment type." }, { status: 400 });
      }
      if (input.amount === undefined) {
        return NextResponse.json({ message: "National dues require an explicit amount." }, { status: 400 });
      }
    } else {
      if (!input.chapterId) {
        return NextResponse.json({ message: "Select the Chapter to bill." }, { status: 400 });
      }
      if (!hasPermission(context, "finance.manage", input.chapterId)) {
        return NextResponse.json({ message: "Finance management permission is required for this Chapter." }, { status: 403 });
      }
    }

    const type = await prisma.assessmentType.findUnique({ where: { code: input.assessmentTypeCode } });
    if (!type) return NextResponse.json({ message: "Assessment type not found." }, { status: 400 });

    const coverageStart = input.coverageStart ? new Date(input.coverageStart) : null;
    const coverageEnd = input.coverageEnd ? new Date(input.coverageEnd) : null;
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (coverageStart && coverageEnd && coverageEnd < coverageStart) {
      return NextResponse.json({ message: "Coverage end cannot be before coverage start." }, { status: 400 });
    }

    const targetChapters = isNational
      ? await prisma.chapters.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : await prisma.chapters.findMany({
          where: { id: input.chapterId as string, status: "ACTIVE" },
          select: { id: true, name: true },
        });

    if (targetChapters.length === 0) {
      return NextResponse.json(
        { message: isNational ? "No active Chapters are available for National billing." : "Selected Chapter is not active." },
        { status: 400 },
      );
    }

    const targetIds = targetChapters.map((chapter) => chapter.id);
    const duplicates = await prisma.assessment.findMany({
      where: {
        chapterId: { in: targetIds },
        assessmentTypeId: type.id,
        title: input.title,
        coverageStart,
        coverageEnd,
        status: { not: "CANCELLED" },
      },
      select: { chapter: { select: { name: true } } },
    });
    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          message: `A matching assessment already exists for ${duplicates.map((item) => item.chapter.name).join(", ")}.`,
        },
        { status: 409 },
      );
    }

    const explicitAmount = input.amount === undefined
      ? null
      : new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    const effectiveAt = coverageStart ?? new Date();
    const amountByChapter = new Map<string, Prisma.Decimal>();

    for (const chapter of targetChapters) {
      if (explicitAmount) {
        amountByChapter.set(chapter.id, explicitAmount);
        continue;
      }
      const rate = await prisma.assessmentRate.findFirst({
        where: {
          chapterId: chapter.id,
          assessmentTypeId: type.id,
          effectiveFrom: { lte: effectiveAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveAt } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (!rate) {
        return NextResponse.json(
          { message: `No effective rate is configured for ${chapter.name}, ${type.name}, and the selected date.` },
          { status: 400 },
        );
      }
      amountByChapter.set(chapter.id, rate.amount);
    }

    const members = await prisma.member.findMany({
      where: { chapterId: { in: targetIds }, membershipStatus: "ACTIVE" },
      select: { id: true, chapterId: true },
    });
    const membersByChapter = new Map<string, Array<{ id: string }>>();
    for (const member of members) {
      const list = membersByChapter.get(member.chapterId) ?? [];
      list.push({ id: member.id });
      membersByChapter.set(member.chapterId, list);
    }

    const created = await prisma.$transaction(async (tx) => {
      const results: Array<{ id: string; chapterId: string; chapterName: string; amount: string; chargedMembers: number }> = [];

      for (const chapter of targetChapters) {
        const amount = amountByChapter.get(chapter.id);
        if (!amount) throw new Error(`Resolved billing amount is missing for ${chapter.name}.`);
        const chapterMembers = membersByChapter.get(chapter.id) ?? [];

        const assessment = await tx.assessment.create({
          data: {
            chapterId: chapter.id,
            assessmentTypeId: type.id,
            title: input.title,
            description: input.description || null,
            amount,
            coverageStart,
            coverageEnd,
            dueAt,
            status: "ACTIVE",
          },
        });

        if (chapterMembers.length > 0) {
          await tx.memberLedgerEntry.createMany({
            data: chapterMembers.map((member) => ({
              chapterId: chapter.id,
              memberId: member.id,
              assessmentId: assessment.id,
              type: "CHARGE" as const,
              amount,
              reference: assessment.id,
              description: input.title,
              occurredAt: new Date(),
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: chapter.id,
            action: isNational ? "NATIONAL_DUES_POSTED" : "ASSESSMENT_POSTED",
            entityType: "Assessment",
            entityId: assessment.id,
            afterJson: {
              billingScope: input.billingScope,
              type: type.code,
              title: assessment.title,
              amount: amount.toFixed(2),
              chargedMembers: chapterMembers.length,
              coverageStart: coverageStart?.toISOString() ?? null,
              coverageEnd: coverageEnd?.toISOString() ?? null,
              dueAt: dueAt?.toISOString() ?? null,
            },
          },
        });

        results.push({
          id: assessment.id,
          chapterId: chapter.id,
          chapterName: chapter.name,
          amount: amount.toFixed(2),
          chargedMembers: chapterMembers.length,
        });
      }

      return results;
    });

    await Promise.allSettled(
      created.map((assessment) => notifyChapterMembers({
        chapterId: assessment.chapterId,
        type: "PAYMENT",
        title: isNational ? "New National dues" : "New Chapter dues / assessment",
        body: `${input.title} — ₱${assessment.amount}`,
        href: "/payments",
      })),
    );

    const chargedMembers = created.reduce((sum, item) => sum + item.chargedMembers, 0);
    return NextResponse.json(
      {
        billingScope: input.billingScope,
        assessment: created[0] ?? null,
        assessments: created,
        chaptersCharged: created.length,
        chargedMembers,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Assessment posting error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to post assessment." }, { status: 500 });
  }
}
