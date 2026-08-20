import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { notifyChapterMembers } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  chapterId: z.string().min(1),
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
    if (!parsed.success) return NextResponse.json({ message: "Invalid assessment information.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const input = parsed.data;
    if (!hasPermission(context, "finance.manage", input.chapterId)) {
      return NextResponse.json({ message: "Finance management permission is required." }, { status: 403 });
    }

    const type = await prisma.assessmentType.findUnique({ where: { code: input.assessmentTypeCode } });
    if (!type) return NextResponse.json({ message: "Assessment type not found." }, { status: 400 });

    const coverageStart = input.coverageStart ? new Date(input.coverageStart) : null;
    const coverageEnd = input.coverageEnd ? new Date(input.coverageEnd) : null;
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (coverageStart && coverageEnd && coverageEnd < coverageStart) {
      return NextResponse.json({ message: "Coverage end cannot be before coverage start." }, { status: 400 });
    }

    const duplicate = await prisma.assessment.findFirst({
      where: {
        chapterId: input.chapterId,
        assessmentTypeId: type.id,
        title: input.title,
        coverageStart,
        coverageEnd,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ message: "A matching assessment already exists for this chapter and coverage." }, { status: 409 });

    let amount: Prisma.Decimal;
    if (input.amount !== undefined) {
      amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    } else {
      const effectiveAt = coverageStart ?? new Date();
      const rate = await prisma.assessmentRate.findFirst({
        where: {
          chapterId: input.chapterId,
          assessmentTypeId: type.id,
          effectiveFrom: { lte: effectiveAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveAt } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (!rate) return NextResponse.json({ message: "No effective rate is configured for this assessment type and date." }, { status: 400 });
      amount = rate.amount;
    }

    const members = await prisma.member.findMany({
      where: { chapterId: input.chapterId, membershipStatus: "ACTIVE" },
      select: { id: true },
    });

    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          chapterId: input.chapterId,
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

      if (members.length > 0) {
        await tx.memberLedgerEntry.createMany({
          data: members.map((member) => ({
            chapterId: input.chapterId,
            memberId: member.id,
            assessmentId: created.id,
            type: "CHARGE" as const,
            amount,
            reference: created.id,
            description: input.title,
            occurredAt: new Date(),
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: input.chapterId,
          action: "ASSESSMENT_POSTED",
          entityType: "Assessment",
          entityId: created.id,
          afterJson: {
            type: type.code,
            title: created.title,
            amount: amount.toFixed(2),
            chargedMembers: members.length,
            coverageStart: coverageStart?.toISOString() ?? null,
            coverageEnd: coverageEnd?.toISOString() ?? null,
          },
        },
      });

      return created;
    });

    await notifyChapterMembers({
      chapterId: input.chapterId,
      type: "PAYMENT",
      title: "New PSP assessment",
      body: `${assessment.title} — ₱${amount.toFixed(2)}`,
      href: "/payments",
    });

    return NextResponse.json({ assessment, chargedMembers: members.length }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Assessment posting error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to post assessment." }, { status: 500 });
  }
}
