import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authorizedChapterIds, getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const expenseSchema = z.object({
  chapterId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(80).default("OPERATING"),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  expenseDate: z.string().datetime(),
  vendor: z.string().trim().max(160).optional().nullable(),
  receiptReference: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid expense details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const input = parsed.data;

    if (!hasPermission(context, "finance.manage", input.chapterId)) {
      return NextResponse.json({ message: "You cannot record expenses for this Chapter." }, { status: 403 });
    }

    const manageable = authorizedChapterIds(context, "finance.manage");
    const chapter = await prisma.chapters.findFirst({
      where: {
        id: input.chapterId,
        status: "ACTIVE",
        ...(manageable === null ? {} : { id: { in: manageable } }),
      },
      select: { id: true, name: true },
    });
    if (!chapter) return NextResponse.json({ message: "Selected Chapter is unavailable." }, { status: 400 });

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) return NextResponse.json({ message: "Expense amount must be greater than zero." }, { status: 400 });

    const expense = await prisma.chapterExpense.create({
      data: {
        chapterId: chapter.id,
        title: input.title,
        category: input.category.toUpperCase(),
        amount,
        expenseDate: new Date(input.expenseDate),
        vendor: input.vendor || null,
        receiptReference: input.receiptReference || null,
        notes: input.notes || null,
        createdByUserId: context.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: context.user.id,
        chapterId: chapter.id,
        action: "CHAPTER_EXPENSE_CREATED",
        entityType: "ChapterExpense",
        entityId: expense.id,
        metadataJson: {
          title: expense.title,
          category: expense.category,
          amount: expense.amount.toFixed(2),
          expenseDate: expense.expenseDate.toISOString(),
        },
      },
    });

    return NextResponse.json({ expense }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chapter expense creation error", error);
    return NextResponse.json({ message: "Unable to record Chapter expense." }, { status: 500 });
  }
}
