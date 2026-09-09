import { NextResponse } from "next/server";
import { AssessmentStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  amount: z.coerce.number().positive().max(10000000),
  coverageStart: z.string().datetime().optional().nullable(),
  coverageEnd: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "CANCELLED"]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

function dateOrNull(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

async function getEditableAssessment(id: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: {
      id: true,
      chapterId: true,
      title: true,
      amount: true,
      _count: { select: { payments: true } },
    },
  });
  return assessment;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid bill information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const assessment = await getEditableAssessment(id);
    if (!assessment) return NextResponse.json({ message: "Bill not found." }, { status: 404 });
    if (!hasPermission(context, "finance.manage", assessment.chapterId)) {
      return NextResponse.json({ message: "Finance management permission is required for this Chapter." }, { status: 403 });
    }

    const input = parsed.data;
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    const coverageStart = dateOrNull(input.coverageStart);
    const coverageEnd = dateOrNull(input.coverageEnd);
    const dueAt = dateOrNull(input.dueAt);
    if (coverageStart && coverageEnd && coverageEnd < coverageStart) {
      return NextResponse.json({ message: "Coverage end cannot be before coverage start." }, { status: 400 });
    }

    if (!assessment.amount.eq(amount) && assessment._count.payments > 0) {
      return NextResponse.json(
        { message: "This bill already has payment activity. Amount cannot be changed; create an adjustment or a new bill instead." },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bill = await tx.assessment.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description || null,
          amount,
          coverageStart,
          coverageEnd,
          dueAt,
          status: input.status ?? AssessmentStatus.ACTIVE,
        },
        select: { id: true, title: true, amount: true, status: true },
      });

      if (!assessment.amount.eq(amount)) {
        await tx.memberLedgerEntry.updateMany({
          where: { assessmentId: id, type: "CHARGE", paymentId: null },
          data: { amount, description: input.title },
        });
      } else if (assessment.title !== input.title) {
        await tx.memberLedgerEntry.updateMany({
          where: { assessmentId: id, type: "CHARGE", paymentId: null },
          data: { description: input.title },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: assessment.chapterId,
          action: "ASSESSMENT_UPDATED",
          entityType: "Assessment",
          entityId: id,
          afterJson: {
            title: bill.title,
            amount: bill.amount.toFixed(2),
            status: bill.status,
            coverageStart: coverageStart?.toISOString() ?? null,
            coverageEnd: coverageEnd?.toISOString() ?? null,
            dueAt: dueAt?.toISOString() ?? null,
          },
        },
      });

      return bill;
    });

    return NextResponse.json({ assessment: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Assessment update error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to update bill." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const assessment = await getEditableAssessment(id);
    if (!assessment) return NextResponse.json({ message: "Bill not found." }, { status: 404 });
    if (!hasPermission(context, "finance.manage", assessment.chapterId)) {
      return NextResponse.json({ message: "Finance management permission is required for this Chapter." }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (assessment._count.payments > 0) {
        const cancelled = await tx.assessment.update({
          where: { id },
          data: { status: "CANCELLED" },
          select: { id: true, title: true, status: true },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: assessment.chapterId,
            action: "ASSESSMENT_CANCELLED_WITH_PAYMENT_HISTORY",
            entityType: "Assessment",
            entityId: id,
            afterJson: { status: cancelled.status, paymentCount: assessment._count.payments },
          },
        });
        return { mode: "cancelled", assessment: cancelled };
      }

      const removedCharges = await tx.memberLedgerEntry.deleteMany({
        where: { assessmentId: id, type: "CHARGE", paymentId: null },
      });
      const cancelled = await tx.assessment.update({
        where: { id },
        data: { status: "CANCELLED" },
        select: { id: true, title: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: assessment.chapterId,
          action: "ASSESSMENT_DELETED",
          entityType: "Assessment",
          entityId: id,
          afterJson: { status: cancelled.status, removedLedgerCharges: removedCharges.count },
        },
      });
      return { mode: "deleted", assessment: cancelled, removedLedgerCharges: removedCharges.count };
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Assessment delete error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to delete bill." }, { status: 500 });
  }
}
