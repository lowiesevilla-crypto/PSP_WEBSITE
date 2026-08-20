import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  chapterId: z.string().min(1),
  assessmentTypeCode: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive().max(10000000),
  effectiveFrom: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid rate configuration." }, { status: 400 });
    const input = parsed.data;
    if (!hasPermission(context, "finance.manage", input.chapterId)) {
      return NextResponse.json({ message: "Finance management permission is required." }, { status: 403 });
    }

    const type = await prisma.assessmentType.findUnique({ where: { code: input.assessmentTypeCode } });
    if (!type) return NextResponse.json({ message: "Assessment type not found." }, { status: 400 });

    const effectiveFrom = new Date(input.effectiveFrom);
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);

    const rate = await prisma.$transaction(async (tx) => {
      const future = await tx.assessmentRate.findFirst({
        where: {
          chapterId: input.chapterId,
          assessmentTypeId: type.id,
          effectiveFrom: { gte: effectiveFrom },
        },
        orderBy: { effectiveFrom: "asc" },
      });
      if (future) throw new Error("A rate already exists on or after this effective date. Adjust the existing schedule instead of overwriting history.");

      const current = await tx.assessmentRate.findFirst({
        where: {
          chapterId: input.chapterId,
          assessmentTypeId: type.id,
          effectiveFrom: { lt: effectiveFrom },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (current) {
        await tx.assessmentRate.update({
          where: { id: current.id },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 1) },
        });
      }

      const created = await tx.assessmentRate.create({
        data: {
          chapterId: input.chapterId,
          assessmentTypeId: type.id,
          amount,
          effectiveFrom,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: input.chapterId,
          action: "ASSESSMENT_RATE_CREATED",
          entityType: "AssessmentRate",
          entityId: created.id,
          afterJson: { assessmentTypeCode: type.code, amount: amount.toFixed(2), effectiveFrom: effectiveFrom.toISOString() },
        },
      });

      return created;
    });

    return NextResponse.json({ rate }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Assessment rate error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to configure assessment rate." }, { status: 400 });
  }
}
