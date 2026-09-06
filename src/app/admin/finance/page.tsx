import Link from "next/link";
import { PaymentCategory, PaymentStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { FinanceManager } from "@/components/admin/finance-manager";
import { ChapterPaymentConfig } from "@/components/admin/chapter-payment-config";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type RegisterView = "payments" | "balances" | "rates" | "assessments";
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];
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
  if (value === "balances" || value === "rates" || value === "assessments") return value;
  return "payments";
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

  const params = await searchParams;
  const view = registerView(single(params.view));
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const requestedStatus = (single(params.status) ?? "").trim().toUpperCase();
  const requestedCategory = (single(params.category) ?? "").trim().toUpperCase();
  const requestedPage = parsePage(single(params.page));
  const chapterFilter = chapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const statusFilter = PAYMENT_STATUSES.includes(requestedStatus as PaymentStatus) ? requestedStatus as PaymentStatus : null;
  const categoryFilter = PAYMENT_CATEGORIES.includes(requestedCategory as PaymentCategory) ? requestedCategory as PaymentCategory : null;
  const authorizedWhere = accessibleIds === null ? {} : { chapterId: { in: accessibleIds } };

  const [paidAggregate, pendingAggregate, failedAggregate, paymentCount] = await Promise.all([
    prisma.payment.aggregate({ where: { ...authorizedWhere, status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...authorizedWhere, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...authorizedWhere, status: "FAILED" }, _sum: { amount: true } }),
    prisma.payment.count({ where: authorizedWhere }),
  ]);

  let totalItems = 0;
  let totalPages = 1;
  let page = 1;
  let payments: Awaited<ReturnType<typeof prisma.payment.findMany>> = [];
  let splitByPaymentId = new Map<string, unknown>();
  let rates: Awaited<ReturnType<typeof prisma.assessmentRate.findMany>> = [];
  let assessments: Awaited<ReturnType<typeof prisma.assessment.findMany>> = [];
  let balanceRows: Array<{ memberId: string; membershipNo: string; memberName: string; chapterName: string; chapterCode: string; balance: Prisma.Decimal }> = [];

  if (view === "payments") {
    const paymentWhere: Prisma.PaymentWhereInput = {
      ...authorizedWhere,
      ...(chapterFilter ? { chapterId: chapterFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
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

  if (view === "assessments") {
    const assessmentWhere: Prisma.AssessmentWhereInput = {
      ...authorizedWhere,
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
      include: { chapter: { select: { name: true, code: true } }, assessmentType: { select: { name: true, code: true } } },
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
    status: view === "payments" ? statusFilter ?? undefined : undefined,
    category: view === "payments" ? categoryFilter ?? undefined : undefined,
  };

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Finance</p>
          <h1>Chapter Billing, Payments & Reconciliation</h1>
          <p style={{ marginTop: 8, maxWidth: 800, color: "#746b5b", lineHeight: 1.55 }}>
            National Admin sees all explicitly authorized Chapters; Chapter Admin stays inside the exact Chapter scope. Collection metrics below are calculated from the complete authorized payment ledger—not a fixed recent-record sample.
          </p>
        </div>

        <section className="admin-stat-grid" style={{ marginBottom: 18 }}>
          <Metric label="Paid Chapter Collections" value={php(paidAggregate._sum.amount ?? new Prisma.Decimal(0))} />
          <Metric label="Pending / Processing Chapter Amount" value={php(pendingAggregate._sum.amount ?? new Prisma.Decimal(0))} />
          <Metric label="Failed Chapter Amount" value={php(failedAggregate._sum.amount ?? new Prisma.Decimal(0))} />
          <Metric label="Payment Records" value={paymentCount.toLocaleString("en-PH")} />
        </section>

        {manageableChapters.length > 0 ? <ChapterPaymentConfig chapters={manageableChapters.map(({ id, name }) => ({ id, name }))} /> : null}
        {manageableChapters.length > 0 ? <div style={{ marginTop: 18 }}><FinanceManager chapters={manageableChapters.map(({ id, name }) => ({ id, name }))} assessmentTypes={assessmentTypes} /></div> : null}

        <section className="app-panel" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <small style={{ color: "#806500", fontWeight: 900 }}>FINANCE REGISTER</small>
              <h2 style={{ margin: "5px 0 0" }}>{view === "payments" ? "Payment & Split Reconciliation" : view === "balances" ? "Member Balances" : view === "rates" ? "Effective-Dated Rates" : "Assessments"}</h2>
            </div>
            {view === "payments" ? <p style={{ margin: 0, maxWidth: 520, color: "#6b665c", fontSize: ".84rem", lineHeight: 1.5 }}>Chapter amount is what PSP credits to the Chapter/member ledger. Platform fee and gross total are read from the persisted PayMongo split audit for each transaction.</p> : null}
          </div>

          <form className="admin-list-toolbar" method="get" action="/admin/finance">
            <label>Register<select name="view" defaultValue={view}><option value="payments">Payments</option><option value="balances">Member Balances</option><option value="rates">Rates</option><option value="assessments">Assessments</option></select></label>
            <label className="admin-search-field">Search<input name="q" defaultValue={q} placeholder={view === "payments" ? "Member, receipt, reference, assessment or Chapter…" : "Member, Chapter, rate or assessment…"} /></label>
            <label>Chapter<select name="chapter" defaultValue={chapterFilter}><option value="">All authorized Chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}</select></label>
            {view === "payments" ? <><label>Status<select name="status" defaultValue={statusFilter ?? ""}><option value="">All statuses</option>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Category<select name="category" defaultValue={categoryFilter ?? ""}><option value="">All categories</option>{PAYMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></> : null}
            <button className="btn btn-primary" type="submit">Search / Filter</button>
            <Link className="btn" href={`/admin/finance?view=${view}`} style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
          </form>

          {view === "payments" ? <PaymentRegister payments={payments} splitByPaymentId={splitByPaymentId} /> : null}
          {view === "balances" ? <BalanceRegister rows={balanceRows} /> : null}
          {view === "rates" ? <RateRegister rows={rates} /> : null}
          {view === "assessments" ? <AssessmentRegister rows={assessments} /> : null}

          <AdminPagination pathname="/admin/finance" page={page} totalPages={totalPages} totalItems={totalItems} query={registerQuery} />
        </section>
      </div>
    </main>
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
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Member</th><th>Chapter</th><th>Current Balance</th><th>Position</th></tr></thead><tbody>{rows.map((row) => <tr key={row.memberId}><td data-label="Member"><strong>{row.memberName}</strong><small style={{ display: "block", color: "#746b5b" }}>{row.membershipNo}</small></td><td data-label="Chapter"><strong>{row.chapterName}</strong><small style={{ display: "block", color: "#746b5b" }}>{row.chapterCode}</small></td><td data-label="Current Balance"><strong>{php(row.balance)}</strong></td><td data-label="Position">{row.balance.gt(0) ? "Outstanding" : "Credit"}</td></tr>)}</tbody></table></div>;
}

function RateRegister({ rows }: { rows: Array<any> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No rate records match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Chapter</th><th>Assessment Type</th><th>Amount</th><th>Effective From</th><th>Effective To</th><th>Status</th></tr></thead><tbody>{rows.map((rate) => <tr key={rate.id}><td data-label="Chapter"><strong>{rate.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{rate.chapter.code}</small></td><td data-label="Assessment Type"><strong>{rate.assessmentType.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{rate.assessmentType.code}</small></td><td data-label="Amount"><strong>{php(rate.amount)}</strong></td><td data-label="Effective From">{rate.effectiveFrom.toLocaleDateString("en-PH")}</td><td data-label="Effective To">{rate.effectiveTo ? rate.effectiveTo.toLocaleDateString("en-PH") : "—"}</td><td data-label="Status">{rate.effectiveTo ? "Historical" : "Current"}</td></tr>)}</tbody></table></div>;
}

function AssessmentRegister({ rows }: { rows: Array<any> }) {
  if (!rows.length) return <p style={{ color: "#6b665c" }}>No assessments match the current search and filters.</p>;
  return <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Assessment</th><th>Chapter</th><th>Type</th><th>Amount</th><th>Coverage</th><th>Due</th><th>Status</th></tr></thead><tbody>{rows.map((assessment) => <tr key={assessment.id}><td data-label="Assessment"><strong>{assessment.title}</strong>{assessment.description ? <small style={{ display: "block", color: "#746b5b" }}>{assessment.description}</small> : null}</td><td data-label="Chapter"><strong>{assessment.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{assessment.chapter.code}</small></td><td data-label="Type">{assessment.assessmentType.name}</td><td data-label="Amount"><strong>{php(assessment.amount)}</strong></td><td data-label="Coverage">{assessment.coverageStart ? assessment.coverageStart.toLocaleDateString("en-PH") : "—"}{assessment.coverageEnd ? ` → ${assessment.coverageEnd.toLocaleDateString("en-PH")}` : ""}</td><td data-label="Due">{assessment.dueAt ? assessment.dueAt.toLocaleDateString("en-PH") : "—"}</td><td data-label="Status"><strong>{assessment.status}</strong></td></tr>)}</tbody></table></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="app-panel"><small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 8, fontSize: "1.35rem" }}>{value}</strong></div>;
}
