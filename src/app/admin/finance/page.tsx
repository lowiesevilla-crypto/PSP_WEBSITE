import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { FinanceManager } from "@/components/admin/finance-manager";
import { ChapterPaymentConfig } from "@/components/admin/chapter-payment-config";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";
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

  const splitAudits = payments.length
    ? await prisma.auditLog.findMany({
        where: {
          action: SPLIT_PAYMENT_AUDIT_ACTION,
          entityType: "Payment",
          entityId: { in: payments.map((payment) => payment.id) },
        },
        orderBy: { createdAt: "desc" },
        select: { entityId: true, metadataJson: true },
      })
    : [];
  const splitByPaymentId = new Map<string, unknown>();
  for (const audit of splitAudits) {
    if (audit.entityId && !splitByPaymentId.has(audit.entityId)) splitByPaymentId.set(audit.entityId, audit.metadataJson);
  }

  const totals = payments.reduce((acc, payment) => {
    const split = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount);
    if (payment.status === "PAID") {
      acc.chapterPaid = acc.chapterPaid.plus(split.chapterAmount);
      acc.platformFees = acc.platformFees.plus(split.platformFee);
      acc.grossPaid = acc.grossPaid.plus(split.totalAmount);
    }
    if (payment.status === "PENDING" || payment.status === "PROCESSING") acc.pending = acc.pending.plus(split.totalAmount);
    if (payment.status === "FAILED") acc.failed = acc.failed.plus(split.totalAmount);
    return acc;
  }, {
    chapterPaid: new Prisma.Decimal(0),
    platformFees: new Prisma.Decimal(0),
    grossPaid: new Prisma.Decimal(0),
    pending: new Prisma.Decimal(0),
    failed: new Prisma.Decimal(0),
  });

  const balances = new Map<string, { member: typeof ledger[number]["member"]; balance: Prisma.Decimal }>();
  for (const entry of ledger) {
    const current = balances.get(entry.memberId) ?? { member: entry.member, balance: new Prisma.Decimal(0) };
    current.balance = current.balance.plus(ledgerSignedAmount(entry));
    balances.set(entry.memberId, current);
  }
  const outstanding = Array.from(balances.values())
    .filter((item) => item.balance.greaterThan(0))
    .sort((a, b) => b.balance.comparedTo(a.balance))
    .slice(0, 100);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Finance</p>
          <h1>Billing, Split Settlement & Reconciliation</h1>
        </div>

        <section className="admin-stat-grid" style={{ marginBottom: 18 }}>
          <Metric label="Chapter Collections" value={php(totals.chapterPaid)} />
          <Metric label="Platform Convenience Fees" value={php(totals.platformFees)} />
          <Metric label="Gross Paid" value={php(totals.grossPaid)} />
          <Metric label="Pending Gross" value={php(totals.pending)} />
          <Metric label="Failed Gross" value={php(totals.failed)} />
        </section>

        {manageableChapters.length > 0 ? <ChapterPaymentConfig chapters={manageableChapters} /> : null}
        {manageableChapters.length > 0 ? <FinanceManager chapters={manageableChapters} assessmentTypes={assessmentTypes} /> : null}

        <section className="app-panel" style={{ marginTop: 18, overflowX: "auto" }}>
          <h2>PayMongo Split Reconciliation</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.55 }}>
            Chapter amount is the value credited to the member ledger and chapter collections. Platform fee is separately settled to the PSP platform PayMongo account.
          </p>
          <table className="admin-responsive-table" style={{ minWidth: 1050 }}>
            <thead>
              <tr>
                <th align="left">Date</th>
                <th align="left">Member</th>
                <th align="left">Chapter</th>
                <th align="left">Type</th>
                <th align="right">Chapter Amount</th>
                <th align="right">Platform Fee</th>
                <th align="right">Total</th>
                <th align="left">Status</th>
                <th align="left">Reference</th>
                <th align="left">Receipt</th>
              </tr>
            </thead>
            <tbody>{payments.map((payment) => {
              const split = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount);
              return (
                <tr key={payment.id}>
                  <td data-label="Date">{payment.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                  <td data-label="Member"><strong>{payment.member.membershipNo}</strong><br /><small>{payment.member.firstName} {payment.member.lastName}</small></td>
                  <td data-label="Chapter">{payment.chapter.name}</td>
                  <td data-label="Type">{payment.category}<br /><small>{payment.assessment?.title ?? payment.description ?? "PSP Payment"}</small></td>
                  <td data-label="Chapter Amount" align="right">{php(split.chapterAmount)}</td>
                  <td data-label="Platform Fee" align="right">{php(split.platformFee)}</td>
                  <td data-label="Total" align="right"><strong>{php(split.totalAmount)}</strong></td>
                  <td data-label="Status">{payment.status}</td>
                  <td data-label="Reference"><small>{payment.internalReference}<br />{payment.gatewayReference ?? "—"}<br />{split.paymentMethod?.toUpperCase() ?? "PAYMONGO"}</small></td>
                  <td data-label="Receipt">{payment.receipt ? <a href={`/api/payments/receipts/${payment.receipt.id}/pdf`}>{payment.receipt.receiptNumber}</a> : "—"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </section>

        <div className="admin-card-grid" style={{ marginTop: 18 }}>
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
  return (
    <div className="app-panel">
      <small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 8, fontSize: "1.35rem" }}>{value}</strong>
    </div>
  );
}
