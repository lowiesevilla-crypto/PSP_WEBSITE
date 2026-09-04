import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ledgerSignedAmount } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { member } = await requireCurrentMember();
    const [entries, payments] = await Promise.all([
      prisma.memberLedgerEntry.findMany({
        where: { memberId: member.id },
        orderBy: { occurredAt: "desc" },
        include: { assessment: { include: { assessmentType: true } } },
      }),
      prisma.payment.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { assessment: { select: { title: true } }, receipt: true },
      }),
    ]);

    let balance = new Prisma.Decimal(0);
    const byAssessment = new Map<string, Prisma.Decimal>();
    for (const entry of entries) {
      const signed = ledgerSignedAmount(entry);
      balance = balance.plus(signed);
      if (entry.assessmentId) {
        byAssessment.set(entry.assessmentId, (byAssessment.get(entry.assessmentId) ?? new Prisma.Decimal(0)).plus(signed));
      }
    }

    const totalContributions = payments
      .filter((payment) => payment.status === "PAID" && payment.category === "CONTRIBUTION")
      .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    const totalChapterPayments = payments
      .filter((payment) => payment.status === "PAID")
      .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));

    const assessments = await prisma.assessment.findMany({
      where: { chapterId: member.chapterId, id: { in: [...byAssessment.keys()] }, status: { in: ["ACTIVE", "CLOSED"] } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: { assessmentType: true },
    });

    return NextResponse.json(
      {
        balance: balance.toFixed(2),
        totalContributions: totalContributions.toFixed(2),
        totalChapterPayments: totalChapterPayments.toFixed(2),
        assessments: assessments.map((assessment) => ({
          id: assessment.id,
          title: assessment.title,
          type: assessment.assessmentType.name,
          amount: assessment.amount.toFixed(2),
          outstanding: (byAssessment.get(assessment.id) ?? new Prisma.Decimal(0)).toFixed(2),
          dueAt: assessment.dueAt?.toISOString() ?? null,
          coverageStart: assessment.coverageStart?.toISOString() ?? null,
          coverageEnd: assessment.coverageEnd?.toISOString() ?? null,
        })),
        ledger: entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          amount: entry.amount.toFixed(2),
          signedAmount: ledgerSignedAmount(entry).toFixed(2),
          description: entry.description,
          reference: entry.reference,
          occurredAt: entry.occurredAt.toISOString(),
          assessmentTitle: entry.assessment?.title ?? null,
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          internalReference: payment.internalReference,
          gatewayReference: payment.gatewayReference,
          category: payment.category,
          description: payment.description,
          chapterAmount: payment.amount.toFixed(2),
          status: payment.status,
          paidAt: payment.paidAt?.toISOString() ?? null,
          createdAt: payment.createdAt.toISOString(),
          assessmentTitle: payment.assessment?.title ?? null,
          receipt: payment.receipt ? { id: payment.receipt.id, receiptNumber: payment.receipt.receiptNumber } : null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Member finance error", error);
    return NextResponse.json({ message: "Unable to load member finances." }, { status: 500 });
  }
}
