import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { FinanceManager } from "@/components/admin/finance-manager";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const viewScope = authorizedChapterIds(context, "finance.view");
  const manageScope = authorizedChapterIds(context, "finance.manage");
  if (viewScope !== null && viewScope.length === 0 && manageScope !== null && manageScope.length === 0) redirect("/admin");

  const accessibleIds = viewScope === null ? null : Array.from(new Set([...(viewScope ?? []), ...(manageScope ?? [])]));
  const chapters = await prisma.chapters.findMany({
    where: accessibleIds === null ? { status: "ACTIVE" } : { id: { in: accessibleIds }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const manageableChapters = manageScope === null ? chapters : chapters.filter((chapter) => manageScope.includes(chapter.id));
  const assessmentTypes = await prisma.assessmentType.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } });

  const where = accessibleIds === null ? {} : { chapterId: { in: accessibleIds } };
  const [payments, rates, assessments, ledger] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        chapter: { select: { name: true } },
        member: { select: { membershipNo: true, firstName: true, lastName: true } },
        assessment: { select: { title: true } },
        receipt: { select: { id: true, receiptNumber: true } },
      },
    }),
    prisma.assessmentRate.findMany({
      where,
      orderBy: { effectiveFrom: "desc" },
      take: 100,
      include: { chapter: { select: { name: true } }, assessmentType: { select: { name: true } } },
    }),
    prisma.assessment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { chapter: { select: { name: true } }, assessmentType: { select: { name: true } } },
    }),
    prisma.memberLedgerEntry.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 4000,
      include: { member: { select: { id: true, membershipNo: true, firstName: true, lastName: true, chapterId: true } } },
    }),
  ]);

  const totals = payments.reduce((acc, payment) => {
    if (payment.status === "PAID") acc.paid = acc.paid.plus(payment.amount);
    if (payment.status === "PENDING" || payment.status === "PROCESSING") acc.pending = acc.pending.plus(payment.amount);
    if (payment.status === "FAILED") acc.failed = acc.failed.plus(payment.amount);
    if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") acc.refunded = acc.refunded.plus(payment.amount);
    return acc;
  }, { paid: new Prisma.Decimal(0), pending: new Prisma.Decimal(0), failed: new Prisma.Decimal(0), refunded: new Prisma.Decimal(0) });

  const balances = new Map<string, { member: typeof ledger[number]["member"]; balance: Prisma.Decimal }>();
  for (const entry of ledger) {
    const current = balances.get(entry.memberId) ?? { member: entry.member, balance: new Prisma.Decimal(0) };
    current.balance = current.balance.plus(ledgerSignedAmount(entry));
    balances.set(entry.memberId, current);
  }
  const outstanding = Array.from(balances.values()).filter((item) => item.balance.greaterThan(0)).sort((a, b) => b.balance.comparedTo(a.balance)).slice(0, 100);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Finance</p><h1>Billing & Reconciliation</h1></div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
          <Metric label="Confirmed Collections" value={php(totals.paid)} />
          <Metric label="Pending Payments" value={php(totals.pending)} />
          <Metric label="Failed Payments" value={php(totals.failed)} />
          <Metric label="Refunded" value={php(totals.refunded)} />
        </section>

        {manageableChapters.length > 0 && <FinanceManager chapters={manageableChapters} assessmentTypes={assessmentTypes} />}

        <section className="app-panel" style={{ marginTop: 18, overflowX: "auto" }}>
          <h2>PayMongo Reconciliation</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
            <thead><tr><th align="left">Date</th><th align="left">Member</th><th align="left">Chapter</th><th align="left">Assessment</th><th align="right">Amount</th><th align="left">Status</th><th align="left">Reference</th><th align="left">Receipt</th></tr></thead>
            <tbody>{payments.map((payment) => (
              <tr key={payment.id} style={{ borderTop: "1px solid #eee5d4" }}>
                <td>{payment.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                <td>{payment.member.membershipNo} · {payment.member.firstName} {payment.member.lastName}</td>
                <td>{payment.chapter.name}</td>
                <td>{payment.assessment?.title ?? "PSP Payment"}</td>
                <td align="right">{php(payment.amount)}</td>
                <td>{payment.status}</td>
                <td><small>{payment.internalReference}<br />{payment.gatewayReference ?? "—"}</small></td>
                <td>{payment.receipt ? <a href={`/api/payments/receipts/${payment.receipt.id}/pdf`}>{payment.receipt.receiptNumber}</a> : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginTop: 18 }}>
          <section className="app-panel">
            <h2>Outstanding Member Balances</h2>
            {outstanding.length === 0 ? <p style={{ color: "#6b665c" }}>No outstanding balance in loaded ledger records.</p> : outstanding.map((item) => (
              <div key={item.member.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid #eee5d4" }}>
                <span>{item.member.membershipNo} · {item.member.firstName} {item.member.lastName}</span><strong>{php(item.balance)}</strong>
              </div>
            ))}
          </section>

          <section className="app-panel">
            <h2>Current / Historical Rates</h2>
            {rates.map((rate) => (
              <div key={rate.id} style={{ padding: "10px 0", borderTop: "1px solid #eee5d4" }}>
                <strong>{rate.chapter.name} · {rate.assessmentType.name}</strong>
                <div>{php(rate.amount)} · from {rate.effectiveFrom.toLocaleDateString("en-PH")}{rate.effectiveTo ? ` to ${rate.effectiveTo.toLocaleDateString("en-PH")}` : " · current"}</div>
              </div>
            ))}
          </section>

          <section className="app-panel">
            <h2>Recent Assessments</h2>
            {assessments.map((assessment) => (
              <div key={assessment.id} style={{ padding: "10px 0", borderTop: "1px solid #eee5d4" }}>
                <strong>{assessment.title}</strong>
                <div>{assessment.chapter.name} · {assessment.assessmentType.name} · {php(assessment.amount)} · {assessment.status}</div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="app-panel"><small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 8, fontSize: "1.5rem" }}>{value}</strong></div>;
}
