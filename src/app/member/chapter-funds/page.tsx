import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCurrentMember } from "@/lib/member/current-member";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chapter Funds" };

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function yearStart(value: Date) {
  return new Date(value.getFullYear(), 0, 1);
}

function nextMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function nextYear(value: Date) {
  return new Date(value.getFullYear() + 1, 0, 1);
}

export default async function ChapterFundsPage() {
  let current;
  try {
    current = await requireCurrentMember();
  } catch {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { id: current.member.id },
    select: { chapterId: true, chapter: { select: { name: true, code: true } } },
  });
  if (!member) redirect("/login");

  const now = new Date();
  const monthFrom = monthStart(now);
  const monthTo = nextMonth(now);
  const yearFrom = yearStart(now);
  const yearTo = nextYear(now);

  const [paidPayments, splitAudits, expenses, ledger] = await Promise.all([
    prisma.payment.findMany({
      where: { chapterId: member.chapterId, status: "PAID", paidAt: { gte: yearFrom, lt: yearTo } },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: { id: true, amount: true, paidAt: true, createdAt: true, description: true, category: true },
    }),
    prisma.auditLog.findMany({
      where: { action: SPLIT_PAYMENT_AUDIT_ACTION, entityType: "Payment", createdAt: { gte: yearFrom, lt: yearTo } },
      select: { entityId: true, metadataJson: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chapterExpense.findMany({
      where: { chapterId: member.chapterId, expenseDate: { gte: yearFrom, lt: yearTo } },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.memberLedgerEntry.findMany({
      where: { chapterId: member.chapterId },
      select: { memberId: true, type: true, amount: true },
    }),
  ]);

  const splitByPaymentId = new Map<string, unknown>();
  for (const audit of splitAudits) {
    if (audit.entityId && !splitByPaymentId.has(audit.entityId)) splitByPaymentId.set(audit.entityId, audit.metadataJson);
  }

  let collectedMonth = new Prisma.Decimal(0);
  let collectedYear = new Prisma.Decimal(0);
  for (const payment of paidPayments) {
    const paidAt = payment.paidAt ?? payment.createdAt;
    const chapterAmount = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount).chapterAmount;
    collectedYear = collectedYear.plus(chapterAmount);
    if (paidAt >= monthFrom && paidAt < monthTo) collectedMonth = collectedMonth.plus(chapterAmount);
  }

  let expensesMonth = new Prisma.Decimal(0);
  let expensesYear = new Prisma.Decimal(0);
  for (const expense of expenses) {
    expensesYear = expensesYear.plus(expense.amount);
    if (expense.expenseDate >= monthFrom && expense.expenseDate < monthTo) expensesMonth = expensesMonth.plus(expense.amount);
  }

  const memberBalances = new Map<string, Prisma.Decimal>();
  for (const entry of ledger) {
    const currentBalance = memberBalances.get(entry.memberId) ?? new Prisma.Decimal(0);
    memberBalances.set(entry.memberId, currentBalance.plus(ledgerSignedAmount(entry)));
  }
  const unpaidTotal = Array.from(memberBalances.values()).reduce(
    (total, balance) => balance.gt(0) ? total.plus(balance) : total,
    new Prisma.Decimal(0),
  );

  return (
    <main className="app-shell" data-member-chapter-funds-version="month-year-expense-ledger-v1">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>Chapter Funds</span>
          </Link>
          <Link className="btn" href="/member" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Dashboard</Link>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div className="app-greeting">
          <p>{member.chapter.name} · {member.chapter.code}</p>
          <h1>Chapter Funds</h1>
          <p style={{ marginTop: 7, color: "#746b5b", lineHeight: 1.55 }}>Read-only transparency view for collected Chapter funds, recorded expenses, and outstanding dues/contributions.</p>
        </div>

        <section className="chapter-funds-grid">
          <FundMetric label="Collected This Month" value={php(collectedMonth)} />
          <FundMetric label="Collected This Year" value={php(collectedYear)} />
          <FundMetric label="Expenses This Month" value={php(expensesMonth)} />
          <FundMetric label="Expenses This Year" value={php(expensesYear)} />
          <FundMetric label="Unpaid Dues & Contributions" value={php(unpaidTotal)} />
          <FundMetric label="Current Net This Year" value={php(collectedYear.minus(expensesYear))} />
        </section>

        <div className="chapter-funds-sections">
          <section className="app-panel">
            <h2>Recent Collections</h2>
            <div className="fund-list">
              {paidPayments.slice(0, 10).map((payment) => (
                <div className="fund-list-row" key={payment.id}>
                  <div><strong>{payment.description ?? payment.category}</strong><small>{(payment.paidAt ?? payment.createdAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</small></div>
                  <strong>{php(splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount).chapterAmount)}</strong>
                </div>
              ))}
              {!paidPayments.length ? <p style={{ color: "#6b665c", margin: 0 }}>No successful collections recorded this year.</p> : null}
            </div>
          </section>

          <section className="app-panel">
            <h2>Recent Expenses</h2>
            <div className="fund-list">
              {expenses.slice(0, 10).map((expense) => (
                <div className="fund-list-row" key={expense.id}>
                  <div><strong>{expense.title}</strong><small>{expense.category} · {expense.expenseDate.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</small></div>
                  <strong>{php(expense.amount)}</strong>
                </div>
              ))}
              {!expenses.length ? <p style={{ color: "#6b665c", margin: 0 }}>No Chapter expenses recorded this year.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FundMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-panel chapter-fund-metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
