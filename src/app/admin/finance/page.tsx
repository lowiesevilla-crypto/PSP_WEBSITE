import Link from "next/link";
import type { ReactNode } from "react";
import { PaymentCategory, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AssessmentActions } from "@/components/admin/assessment-actions";
import { BalanceActions } from "@/components/admin/balance-actions";
import { ChapterExpenseForm } from "@/components/admin/chapter-expense-form";
import { FinanceManager } from "@/components/admin/finance-manager";
import { ChapterPaymentConfig } from "@/components/admin/chapter-payment-config";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type RegisterView = "assessments" | "create" | "payments" | "balances" | "expenses" | "rates" | "setup";
const PAYMENT_CATEGORIES: PaymentCategory[] = ["DUES", "CONTRIBUTION", "OTHER"];

type SearchParams = Promise<{
  view?: string | string[];
  q?: string | string[];
  chapter?: string | string[];
  status?: string | string[];
  category?: string | string[];
  page?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function registerView(value: string | undefined): RegisterView {
  if (value === "create" || value === "payments" || value === "balances" || value === "expenses" || value === "rates" || value === "setup" || value === "assessments") return value;
  return "assessments";
}

function viewTitle(view: RegisterView) {
  if (view === "create") return "Create Bill";
  if (view === "payments") return "Payments / Receipts";
  if (view === "balances") return "Member Balances";
  if (view === "expenses") return "Chapter Expenses";
  if (view === "rates") return "Rates";
  if (view === "setup") return "PayMongo Setup";
  return "Created Bills";
}

export default async function AdminFinancePage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const viewScope = authorizedChapterIds(context, "finance.view");
  const manageScope = authorizedChapterIds(context, "finance.manage");
  if (viewScope !== null && viewScope.length === 0 && manageScope !== null && manageScope.length === 0) redirect("/admin");

  const accessibleIds = viewScope === null ? null : Array.from(new Set([...(viewScope ?? []), ...(manageScope ?? [])]));
  const chapters = await prisma.chapters.findMany({
    where: accessibleIds === null ? { status: "ACTIVE" } : { id: { in: accessibleIds }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const manageableChapters = manageScope === null ? chapters : chapters.filter((chapter) => manageScope.includes(chapter.id));
  const assessmentTypes = await prisma.assessmentType.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } });
  const activeMembers = await prisma.member.findMany({
    where: {
      membershipStatus: "ACTIVE",
      ...(manageScope === null ? {} : { chapterId: { in: manageScope } }),
    },
    orderBy: [{ chapter: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    take: 5000,
    select: {
      id: true,
      membershipNo: true,
      firstName: true,
      lastName: true,
      chapterId: true,
      chapter: { select: { name: true } },
    },
  });

  const params = await searchParams;
  const view = registerView(single(params.view));
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const requestedCategory = (single(params.category) ?? "").trim().toUpperCase();
  const requestedPage = parsePage(single(params.page));
  const chapterFilter = chapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const categoryFilter = PAYMENT_CATEGORIES.includes(requestedCategory as PaymentCategory) ? requestedCategory as PaymentCategory : null;
  const authorizedWhere = accessibleIds === null ? {} : { chapterId: { in: accessibleIds } };

  const paidPaymentsForTotals = await prisma.payment.findMany({ where: { ...authorizedWhere, status: "PAID" }, select: { id: true, amount: true } });
  const paidSplitAudits = paidPaymentsForTotals.length ? await prisma.auditLog.findMany({
    where: {
      action: SPLIT_PAYMENT_AUDIT_ACTION,
      entityType: "Payment",
      entityId: { in: paidPaymentsForTotals.map((payment) => payment.id) },
    },
    select: { entityId: true, metadataJson: true },
    orderBy: { createdAt: "desc" },
  }) : [];
  const paidSplitByPaymentId = new Map<string, unknown>();
  for (const audit of paidSplitAudits) {
    if (audit.entityId && !paidSplitByPaymentId.has(audit.entityId)) paidSplitByPaymentId.set(audit.entityId, audit.metadataJson);
  }
  const successfulPaymentCount = paidPaymentsForTotals.length;
  let chapterCollected = new Prisma.Decimal(0);
  let convenienceFeeCollected = new Prisma.Decimal(0);
  let grossCollected = new Prisma.Decimal(0);
  for (const payment of paidPaymentsForTotals) {
    const split = splitAmountsFromMetadata(paidSplitByPaymentId.get(payment.id), payment.amount);
    chapterCollected = chapterCollected.plus(split.chapterAmount);
    convenienceFeeCollected = convenienceFeeCollected.plus(split.platformFee);
    grossCollected = grossCollected.plus(split.totalAmount);
  }

  let totalItems = 0;
  let totalPages = 1;
  let page = 1;
  let payments: Awaited<ReturnType<typeof prisma.payment.findMany>> = [];
  let splitByPaymentId = new Map<string, unknown>();
  let rates: Awaited<ReturnType<typeof prisma.assessmentRate.findMany>> = [];
  let assessments: Awaited<ReturnType<typeof prisma.assessment.findMany>> = [];
  let expenses: Awaited<ReturnType<typeof prisma.chapterExpense.findMany>> = [];
  let balanceRows: Array<{ memberId: string; membershipNo: string; memberName: string; chapterName: string; chapterCode: string; balance: Prisma.Decimal }> = [];

  if (view === "payments") {
    const paymentWhere: Prisma.PaymentWhereInput = {
      ...authorizedWhere,
      status: "PAID",
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(q ? {
        OR: [
          { internalReference: { contains: q } },
          { gatewayReference: { contains: q } },
          { description: { contains: q } },
          { member: { membershipNo: { contains: q } } },
          { member: { firstName: { contains: q } } },
          { member: { lastName: { contains: q } } },
          { chapter: { name: { contains: q } } },
          { chapter: { code: { contains: q } } },
          { assessment: { title: { contains: q } } },
          { receipt: { receiptNumber: { contains: q } } },
        ],
      } : {}),
    };
    totalItems = await prisma.payment.count({ where: paymentWhere });
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    payments = await prisma.payment.findMany({
      where: paymentWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        chapter: { select: { name: true, code: true } },
        member: { select: { membershipNo: true, firstName: true, lastName: true } },
        assessment: { select: { title: true } },
        receipt: { select: { id: true, receiptNumber: true } },
      },
    }) as typeof payments;
    const splitAudits = payments.length ? await prisma.auditLog.findMany({
      where: {
        action: SPLIT_PAYMENT_AUDIT_ACTION,
        entityType: "Payment",
        entityId: { in: payments.map((payment) => payment.id) },
      },
      orderBy: { createdAt: "desc" },
      select: { entityId: true, metadataJson: true },
    }) : [];
    splitByPaymentId = new Map<string, unknown>();
    for (const audit of splitAudits) {
      if (audit.entityId && !splitByPaymentId.has(audit.entityId)) splitByPaymentId.set(audit.entityId, audit.metadataJson);
    }
  }

  if (view === "rates") {
    const rateWhere: Prisma.AssessmentRateWhereInput = {
      ...authorizedWhere,
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(q ? { OR: [{ chapter: { name: { contains: q } } }, { chapter: { code: { contains: q } } }, { assessmentType: { name: { contains: q } } }, { assessmentType: { code: { contains: q } } }] } : {}),
    };
    totalItems = await prisma.assessmentRate.count({ where: rateWhere });
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    rates = await prisma.assessmentRate.findMany({
      where: rateWhere,
      orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { chapter: { select: { name: true, code: true } }, assessmentType: { select: { name: true, code: true } } },
    }) as typeof rates;
  }

  if (view === "expenses") {
    const expenseWhere: Prisma.ChapterExpenseWhereInput = {
      ...authorizedWhere,
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { category: { contains: q } },
          { vendor: { contains: q } },
          { receiptReference: { contains: q } },
          { notes: { contains: q } },
          { chapter: { name: { contains: q } } },
          { chapter: { code: { contains: q } } },
        ],
      } : {}),
    };
    totalItems = await prisma.chapterExpense.count({ where: expenseWhere });
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    expenses = await prisma.chapterExpense.findMany({
      where: expenseWhere,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { chapter: { select: { name: true, code: true } } },
    }) as typeof expenses;
  }

  if (view === "assessments") {
    const assessmentWhere: Prisma.AssessmentWhereInput = {
      ...authorizedWhere,
      status: { not: "CANCELLED" },
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }, { chapter: { name: { contains: q } } }, { chapter: { code: { contains: q } } }, { assessmentType: { name: { contains: q } } }] } : {}),
    };
    totalItems = await prisma.assessment.count({ where: assessmentWhere });
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    assessments = await prisma.assessment.findMany({
      where: assessmentWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        chapter: { select: { name: true, code: true } },
        assessmentType: { select: { name: true, code: true } },
        _count: { select: { ledgerEntries: true, payments: true } },
      },
    }) as typeof assessments;
  }

  if (view === "balances") {
    const ledgerWhere: Prisma.MemberLedgerEntryWhereInput = {
      ...authorizedWhere,
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(q ? {
        member: {
          OR: [
            { membershipNo: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { chapter: { name: { contains: q } } },
            { chapter: { code: { contains: q } } },
          ],
        },
      } : {}),
    };
    const ledger = await prisma.memberLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: { occurredAt: "asc" },
      select: {
        memberId: true,
        type: true,
        amount: true,
        member: { select: { membershipNo: true, firstName: true, lastName: true, chapter: { select: { name: true, code: true } } } },
      },
    });
    const balances = new Map<string, { membershipNo: string; memberName: string; chapterName: string; chapterCode: string; balance: Prisma.Decimal }>();
    for (const entry of ledger) {
      const current = balances.get(entry.memberId) ?? {
        membershipNo: entry.member.membershipNo,
        memberName: `${entry.member.firstName} ${entry.member.lastName}`,
        chapterName: entry.member.chapter.name,
        chapterCode: entry.member.chapter.code,
        balance: new Prisma.Decimal(0),
      };
      current.balance = current.balance.plus(ledgerSignedAmount(entry));
      balances.set(entry.memberId, current);
    }
    const allBalances = Array.from(balances.entries())
      .map(([memberId, item]) => ({ memberId, ...item }))
      .filter((item) => !item.balance.eq(0))
      .sort((a, b) => b.balance.comparedTo(a.balance) || a.memberName.localeCompare(b.memberName));
    totalItems = allBalances.length;
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    balanceRows = allBalances.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const registerQuery = {
    view,
    q: q || undefined,
    chapter: chapterFilter || undefined,
    category: view === "payments" ? categoryFilter ?? undefined : undefined,
  };

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Finance</p>
          <h1>Billing & Payments</h1>
          <p style={{ marginTop: 8, maxWidth: 800, color: "#746b5b", lineHeight: 1.55 }}>
            Create member bills, review posted bills, and track online payments. Chapter Admin stays inside the authorized Chapter scope; National Admin can manage authorized Chapter or National billing.
          </p>
        </div>

        <section className="admin-stat-grid" style={{ marginBottom: 18 }}>
          <Metric label="Successful Payments" value={successfulPaymentCount.toLocaleString("en-PH")} />
          <Metric label="Total Collected" value={php(chapterCollected)} />
          <Metric label="Convenience Fees Collected" value={php(convenienceFeeCollected)} />
          <Metric label="Gross Successful Payments" value={php(grossCollected)} />
        </section>

        <nav className="app-panel" aria-label="Finance views" style={{ marginTop: 18, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FinanceViewLink href="/admin/finance?view=assessments" active={view === "assessments"}>Created Bills</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=create" active={view === "create"}>Create Bill</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=payments" active={view === "payments"}>Payments / Receipts</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=balances" active={view === "balances"}>Balances</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=expenses" active={view === "expenses"}>Expenses</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=rates" active={view === "rates"}>Rates</FinanceViewLink>
            <FinanceViewLink href="/admin/finance?view=setup" active={view === "setup"}>PayMongo Setup</FinanceViewLink>
          </div>
        </nav>

        {view === "create" && manageableChapters.length > 0 ? (
          <section style={{ marginTop: 18 }} data-finance-simple-layout-version="separate-create-bill-v1">
            <FinanceManager chapters={manageableChapters.map(({ id, name }) => ({ id, name }))} activeMembers={activeMembers.map((member) => ({ id: member.id, membershipNo: member.membershipNo, name: `${member.firstName} ${member.lastName}`, chapterId: member.chapterId, chapterName: member.chapter.name }))} assessmentTypes={assessmentTypes} />
          </section>
        ) : null}

        {view === "setup" && manageableChapters.length > 0 ? (
          <section style={{ marginTop: 18 }} data-finance-simple-layout-version="separate-paymongo-setup-v1">
            <ChapterPaymentConfig chapters={manageableChapters.map(({ id, name }) => ({ id, name }))} />
          </section>
        ) : null}

        {view === "expenses" && manageableChapters.length > 0 ? (
          <section style={{ marginTop: 18 }} data-finance-simple-layout-version="separate-expenses-v1">
            <ChapterExpenseForm chapters={manageableChapters} />
          </section>
        ) : null}

        {view !== "create" && view !== "setup" ? <section className="app-panel" style={{ marginTop: 18 }} data-finance-simple-layout-version="separate-registers-v1">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <small style={{ color: "#806500", fontWeight: 900 }}>FINANCE REGISTER</small>
              <h2 style={{ margin: "5px 0 0" }}>{viewTitle(view)}</h2>
            </div>
            <Link className="btn btn-primary" href="/admin/finance?view=create">Create New Bill</Link>
            {view === "payments" ? <p style={{ margin: 0, maxWidth: 520, color: "#6b665c", fontSize: ".84rem", lineHeight: 1.5 }}>This register shows successful paid payments only. Total collected is credited to the Chapter ledger; convenience fee is the PSP platform split.</p> : null}
          </div>

          <form className="admin-list-toolbar" method="get" action="/admin/finance">
            <label>View<select name="view" defaultValue={view}><option value="assessments">Created Bills</option><option value="payments">Payments / Receipts</option><option value="balances">Member Balances</option><option value="expenses">Chapter Expenses</option><option value="rates">Rates</option></select></label>
            <label className="admin-search-field">Search<input name="q" defaultValue={q} placeholder={view === "payments" ? "Member, receipt, reference, assessment or Chapter…" : "Member, Chapter, rate or assessment…"} /></label>
            <label>Chapter<select name="chapter" defaultValue={chapterFilter}><option value="">All authorized Chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}</select></label>
            {view === "payments" ? <label>Category<select name="category" defaultValue={categoryFilter ?? ""}><option value="">All categories</option>{PAYMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label> : null}
            <button className="btn btn-primary" type="submit">Search / Filter</button>
            <Link className="btn" href={`/admin/finance?view=${view}`} style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
          </form>

          {view === "payments" ? <PaymentRegister payments={payments} splitByPaymentId={splitByPaymentId} /> : null}
          {view === "balances" ? <BalanceRegister rows={balanceRows} /> : null}
          {view === "expenses" ? <ExpenseRegister rows={expenses} /> : null}
          {view === "rates" ? <RateRegister rows={rates} /> : null}
          {view === "assessments" ? <AssessmentRegister rows={assessments} /> : null}

          <AdminPagination pathname="/admin/finance" page={page} totalPages={totalPages} totalItems={totalItems} query={registerQuery} />
        </section> : null}
      </div>
    </main>
  );
}

function FinanceViewLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={active ? "btn btn-primary" : "btn"}
      style={active ? { minHeight: 42 } : { border: "1px solid #ddd5c1", background: "#fff", minHeight: 42 }}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function PaymentRegister({ payments, splitByPaymentId }: { payments: Array<any>; splitByPaymentId: Map<string, unknown> }) {
  if (!payments.length) return <p style={{ color: "#6b665c" }}>No payment records match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Date</th><th>Member</th><th>Chapter</th><th>Type</th><th>Chapter Amount</th><th>Platform Fee</th><th>Total</th><th>Status</th><th>Reference / Receipt</th></tr></thead><tbody>{payments.map((payment) => {
    const split = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount);
    return <tr key={payment.id}><td data-label="Date">{payment.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td><td data-label="Member"><strong>{payment.member.firstName} {payment.member.lastName}</strong><small style={{ display: "block", color: "#746b5b" }}>{payment.member.membershipNo}</small></td><td data-label="Chapter"><strong>{payment.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{payment.chapter.code}</small></td><td data-label="Type"><strong>{payment.category}</strong><small style={{ display: "block", color: "#746b5b" }}>{payment.assessment?.title ?? payment.description ?? "PSP Payment"}</small></td><td data-label="Chapter Amount"><strong>{php(split.chapterAmount)}</strong></td><td data-label="Platform Fee">{php(split.platformFee)}</td><td data-label="Total"><strong>{php(split.totalAmount)}</strong><small style={{ display: "block", color: "#746b5b" }}>{split.paymentMethod?.toUpperCase() ?? "PAYMONGO"}</small></td><td data-label="Status"><strong>{payment.status}</strong></td><td data-label="Reference / Receipt"><small style={{ overflowWrap: "anywhere" }}>{payment.internalReference}<br/>{payment.gatewayReference ?? "—"}</small>{payment.receipt ? <><br/><a href={`/api/payments/receipts/${payment.receipt.id}/pdf`}>{payment.receipt.receiptNumber}</a></> : null}</td></tr>;
  })}</tbody></table></div>;
}

function BalanceRegister({ rows }: { rows: Array<{ memberId: string; membershipNo: string; memberName: string; chapterName: string; chapterCode: string; balance: Prisma.Decimal }> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No non-zero member balances match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Member</th><th>Chapter</th><th>Current Balance</th><th>Position</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.memberId}><td data-label="Member"><strong>{row.memberName}</strong><small style={{ display: "block", color: "#746b5b" }}>{row.membershipNo}</small></td><td data-label="Chapter"><strong>{row.chapterName}</strong><small style={{ display: "block", color: "#746b5b" }}>{row.chapterCode}</small></td><td data-label="Current Balance"><strong>{php(row.balance)}</strong></td><td data-label="Position">{row.balance.gt(0) ? "Outstanding" : "Credit"}</td><td data-label="Actions"><BalanceActions memberId={row.memberId} memberName={row.memberName} balance={php(row.balance)} /></td></tr>)}</tbody></table></div>;
}

function ExpenseRegister({ rows }: { rows: Array<any> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No Chapter expenses match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Date</th><th>Chapter</th><th>Expense</th><th>Category</th><th>Amount</th><th>Reference</th></tr></thead><tbody>{rows.map((expense) => <tr key={expense.id}><td data-label="Date">{expense.expenseDate.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</td><td data-label="Chapter"><strong>{expense.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{expense.chapter.code}</small></td><td data-label="Expense"><strong>{expense.title}</strong>{expense.vendor ? <small style={{ display: "block", color: "#746b5b" }}>{expense.vendor}</small> : null}{expense.notes ? <small style={{ display: "block", color: "#746b5b" }}>{expense.notes}</small> : null}</td><td data-label="Category">{expense.category}</td><td data-label="Amount"><strong>{php(expense.amount)}</strong></td><td data-label="Reference">{expense.receiptReference ?? "—"}</td></tr>)}</tbody></table></div>;
}

function RateRegister({ rows }: { rows: Array<any> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No rate records match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Chapter</th><th>Assessment Type</th><th>Amount</th><th>Effective From</th><th>Effective To</th><th>Status</th></tr></thead><tbody>{rows.map((rate) => <tr key={rate.id}><td data-label="Chapter"><strong>{rate.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{rate.chapter.code}</small></td><td data-label="Assessment Type"><strong>{rate.assessmentType.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{rate.assessmentType.code}</small></td><td data-label="Amount"><strong>{php(rate.amount)}</strong></td><td data-label="Effective From">{rate.effectiveFrom.toLocaleDateString("en-PH")}</td><td data-label="Effective To">{rate.effectiveTo ? rate.effectiveTo.toLocaleDateString("en-PH") : "—"}</td><td data-label="Status">{rate.effectiveTo ? "Historical" : "Current"}</td></tr>)}</tbody></table></div>;
}

function AssessmentRegister({ rows }: { rows: Array<any> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No assessments match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Bill</th><th>Chapter</th><th>Type</th><th>Amount</th><th>Due</th><th>Members / Payments</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((assessment) => <tr key={assessment.id}><td data-label="Bill"><strong>{assessment.title}</strong>{assessment.description ? <small style={{ display: "block", color: "#746b5b" }}>{assessment.description}</small> : null}<small style={{ display: "block", color: "#746b5b" }}>Created {assessment.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</small></td><td data-label="Chapter"><strong>{assessment.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{assessment.chapter.code}</small></td><td data-label="Type">{assessment.assessmentType.name}</td><td data-label="Amount"><strong>{php(assessment.amount)}</strong></td><td data-label="Due">{assessment.dueAt ? assessment.dueAt.toLocaleDateString("en-PH") : "No due date"}{assessment.coverageStart ? <small style={{ display: "block", color: "#746b5b" }}>{assessment.coverageStart.toLocaleDateString("en-PH")}{assessment.coverageEnd ? ` to ${assessment.coverageEnd.toLocaleDateString("en-PH")}` : ""}</small> : null}</td><td data-label="Members / Payments"><strong>{assessment._count?.ledgerEntries ?? 0} charged</strong><small style={{ display: "block", color: "#746b5b" }}>{assessment._count?.payments ?? 0} payment record(s)</small></td><td data-label="Status"><strong>{assessment.status}</strong></td><td data-label="Actions"><AssessmentActions assessment={{ id: assessment.id, title: assessment.title, description: assessment.description ?? "", amount: assessment.amount.toFixed(2), coverageStart: assessment.coverageStart?.toISOString() ?? "", coverageEnd: assessment.coverageEnd?.toISOString() ?? "", dueAt: assessment.dueAt?.toISOString() ?? "", status: assessment.status }} /></td></tr>)}</tbody></table></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="app-panel"><small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 8, fontSize: "1.35rem" }}>{value}</strong></div>;
}
