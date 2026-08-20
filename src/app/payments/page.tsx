import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { PayButton } from "@/components/payments/pay-button";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

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
  const outstanding = new Map<string, Prisma.Decimal>();
  for (const entry of entries) {
    const signed = ledgerSignedAmount(entry);
    balance = balance.plus(signed);
    if (entry.assessmentId) outstanding.set(entry.assessmentId, (outstanding.get(entry.assessmentId) ?? new Prisma.Decimal(0)).plus(signed));
  }

  const assessmentIds = [...outstanding.entries()].filter(([, amount]) => amount.gt(0)).map(([id]) => id);
  const assessments = assessmentIds.length
    ? await prisma.assessment.findMany({
        where: { id: { in: assessmentIds }, chapterId: member.chapterId, status: "ACTIVE" },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        include: { assessmentType: true },
      })
    : [];

  return (
    <main className="app-shell">
      <header className="app-topbar"><div className="container app-nav"><Link className="app-brand" href="/member"><img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" /><span>PSP Payments</span></Link><Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Dashboard</Link></div></header>
      <div className="container app-main">
        <div className="app-greeting"><p>Member Finance</p><h1>Dues, Assessments & Payments</h1></div>

        <section className="app-panel" style={{ marginBottom: 18 }}>
          <small style={{ color: "#746b5b", fontWeight: 800 }}>Current Outstanding Balance</small>
          <strong style={{ display: "block", marginTop: 8, fontSize: "2.25rem", color: balance.gt(0) ? "#8a6500" : "#245b2a" }}>{php(balance)}</strong>
          <p style={{ color: "#6b665c", marginBottom: 0 }}>Chapter: {member.chapter.name} · Membership No. {member.membershipNo}</p>
        </section>

        <section style={{ marginBottom: 22 }}>
          <h2>Outstanding Assessments</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14 }}>
            {assessments.map((assessment) => {
              const amount = outstanding.get(assessment.id) ?? new Prisma.Decimal(0);
              return (
                <article className="app-panel" key={assessment.id} style={{ display: "grid", gap: 11 }}>
                  <div><small style={{ color: "#806500", fontWeight: 900 }}>{assessment.assessmentType.name}</small><h3 style={{ margin: "5px 0 0" }}>{assessment.title}</h3></div>
                  <div><small style={{ color: "#746b5b" }}>Outstanding</small><strong style={{ display: "block", fontSize: "1.55rem" }}>{php(amount)}</strong></div>
                  {assessment.dueAt ? <small style={{ color: "#6b665c" }}>Due {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(assessment.dueAt)}</small> : null}
                  <PayButton assessmentId={assessment.id} outstanding={amount.toFixed(2)} />
                </article>
              );
            })}
            {assessments.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No outstanding payable assessment.</p></div> : null}
          </div>
        </section>

        <section className="app-panel">
          <h2>Payment History</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead><tr><Th>Date</Th><Th>Assessment</Th><Th>Amount</Th><Th>Status</Th><Th>Receipt</Th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(payment.paidAt ?? payment.createdAt)}</Td>
                    <Td>{payment.assessment?.title ?? "Payment"}</Td>
                    <Td>{php(payment.amount)}</Td>
                    <Td>{payment.status}</Td>
                    <Td>{payment.receipt ? <Link href={`/payments/receipts/${payment.receipt.id}`}>{payment.receipt.receiptNumber}</Link> : "—"}</Td>
                  </tr>
                ))}
                {payments.length === 0 ? <tr><td colSpan={5} style={{ padding: 15, color: "#6b665c" }}>No payment history yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd5c1", color: "#6b665c", fontSize: ".82rem" }}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td style={{ padding: "11px 8px", borderBottom: "1px solid #eee7d8" }}>{children}</td>; }
