import { NextResponse } from "next/server";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { member } = await requireCurrentMember();
    const ref = new URL(request.url).searchParams.get("ref")?.trim();
    if (!ref) return NextResponse.json({ message: "Payment reference is required." }, { status: 400 });

    const payment = await prisma.payment.findFirst({
      where: { internalReference: ref, memberId: member.id },
      include: { receipt: true },
    });
    if (!payment) return NextResponse.json({ message: "Payment not found." }, { status: 404 });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount.toFixed(2),
          internalReference: payment.internalReference,
          paidAt: payment.paidAt?.toISOString() ?? null,
          receipt: payment.receipt ? { id: payment.receipt.id, receiptNumber: payment.receipt.receiptNumber } : null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: "Unable to check payment status." }, { status: 500 });
  }
}
