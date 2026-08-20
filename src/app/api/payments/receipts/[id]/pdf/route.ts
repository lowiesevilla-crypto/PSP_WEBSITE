import { NextResponse } from "next/server";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/receipts/generator";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { id } = await params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            assessment: { select: { title: true } },
            chapter: { select: { name: true } },
            member: { select: { id: true, firstName: true, middleInitial: true, lastName: true, membershipNo: true } },
          },
        },
      },
    });
    if (!receipt || receipt.payment.status !== "PAID") return NextResponse.json({ message: "Receipt not found." }, { status: 404 });

    const owner = context.user.member?.id === receipt.payment.memberId;
    const finance = hasPermission(context, "finance.view", receipt.payment.chapterId);
    if (!owner && !finance) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    const memberName = [receipt.payment.member.firstName, receipt.payment.member.middleInitial, receipt.payment.member.lastName].filter(Boolean).join(" ");
    const pdf = await generateReceiptPdf({
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      paidAt: receipt.payment.paidAt,
      memberName,
      membershipNo: receipt.payment.member.membershipNo,
      chapterName: receipt.payment.chapter.name,
      assessmentTitle: receipt.payment.assessment?.title ?? "PSP Payment",
      amount: receipt.payment.amount.toFixed(2),
      internalReference: receipt.payment.internalReference,
      gatewayReference: receipt.payment.gatewayReference,
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receipt.receiptNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Receipt PDF error", error);
    return NextResponse.json({ message: "Unable to generate receipt." }, { status: 500 });
  }
}
