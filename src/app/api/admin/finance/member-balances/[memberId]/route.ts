import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { getMemberBalance } from "@/lib/finance/ledger";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mode: z.enum(["ADJUST", "WRITE_OFF"]),
  amount: z.coerce.number().max(10000000).optional(),
  remarks: z.string().trim().min(1).max(1000),
});

type RouteParams = { params: Promise<{ memberId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { memberId } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid balance adjustment.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, chapterId: true, firstName: true, lastName: true, membershipNo: true },
    });
    if (!member) return NextResponse.json({ message: "Member not found." }, { status: 404 });
    if (!hasPermission(context, "finance.manage", member.chapterId)) {
      return NextResponse.json({ message: "Finance management permission is required for this member Chapter." }, { status: 403 });
    }

    const input = parsed.data;
    const currentBalance = await getMemberBalance(member.id);
    const adjustment = input.mode === "WRITE_OFF"
      ? currentBalance.negated()
      : new Prisma.Decimal(input.amount ?? 0).toDecimalPlaces(2);
    if (adjustment.eq(0)) {
      return NextResponse.json({ message: "Adjustment amount is zero. No balance change was posted." }, { status: 400 });
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.memberLedgerEntry.create({
        data: {
          chapterId: member.chapterId,
          memberId: member.id,
          type: "ADJUSTMENT",
          amount: adjustment,
          reference: input.mode === "WRITE_OFF" ? "BALANCE_WRITE_OFF" : "BALANCE_ADJUSTMENT",
          description: input.remarks,
          occurredAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: input.mode === "WRITE_OFF" ? "MEMBER_BALANCE_WRITTEN_OFF" : "MEMBER_BALANCE_ADJUSTED",
          entityType: "MemberLedgerEntry",
          entityId: created.id,
          afterJson: {
            memberId: member.id,
            membershipNo: member.membershipNo,
            memberName: `${member.firstName} ${member.lastName}`,
            previousBalance: currentBalance.toFixed(2),
            adjustment: adjustment.toFixed(2),
            remarks: input.remarks,
          },
        },
      });
      return created;
    });

    const newBalance = currentBalance.plus(adjustment);
    return NextResponse.json(
      { entryId: entry.id, previousBalance: currentBalance.toFixed(2), adjustment: adjustment.toFixed(2), newBalance: newBalance.toFixed(2) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Member balance adjustment error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to update member balance." }, { status: 500 });
  }
}
