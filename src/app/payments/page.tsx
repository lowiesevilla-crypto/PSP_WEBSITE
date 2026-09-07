import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, PaymentCategory } from "@prisma/client";
import { OtherPaymentForm } from "@/components/payments/other-payment-form";
import { PayButton } from "@/components/payments/pay-button";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
import { getChapterPayMongoConfig } from "@/lib/paymongo/chapter-config";
import { getPersistedSplitAmounts } from "@/lib/paymongo/split-metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DUES_CODES = new Set(["MONTHLY_DUES", "NATIONAL_DUES", "MEMBERSHIP_FEE"]);
const CONTRIBUTION_CODES = new Set(["SPECIAL_ASSESSMENT", "EVENT_CONTRIBUTION", "DONATION"]);

function categoryForAssessment(code: string): PaymentCategory {
  if (DUES_CODES.has(code)) return PaymentCategory.DUES;
  if (CONTRIBUTION_CODES.has(code)) return PaymentCategory.CONTRIBUTION;
  return PaymentCategory.OTHER;
}

export default async function PaymentsPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const [entries, payments, paymentRuntime] = await Promise.all([
    prisma.memberLedgerEntry.findMany({
      where: { memberId: member.id },
      orderBy: { occurredAt: "desc" },
      include: { assessment: { include: { assessmentType: true } } },
    }),
    prisma.payment.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { assessment: { select: { title: true } }, receipt: true },
    }),
    getChapterPayMongoConfig(member.chapterId).then(
      (config) => ({ ready: true as const, methods: config.paymentMethods }),
      () => ({ ready: false as const, methods: [] as string[] }),
    ),
  ]);

  let balance = new Prisma.Decimal(0);
  const outstanding = new Map<string, Prisma.Decimal>();
  for (const entry of entries) {
    const signed = ledgerSignedAmount(entry);
    balance = balance.plus(signed);
    if (entry.assessmentId) {
      outstanding.set(
        entry.assessmentId,
        (outstanding.get(entry.assessmentId) ?? new Prisma.Decimal(0)).plus(signed),
      );
    }
  }

  const totalContributions = payments
    .filter((payment) => payment.status === "PAID" && payment.category === "CONTRIBUTION")
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
  const totalChapterPaid = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));

  const assessmentIds = [...outstanding.entries()]
    .filter(([, amount]) => amount.gt(0))
    .map(([id]) => id);
  const assessments = assessmentIds.length
    ? await prisma.assessment.findMany({
        where: { id: { in: assessmentIds }, chapterId: member.chapterId, status: "ACTIVE" },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        include: { assessmentType: true },
      })
    : [];

  const paymentRows = await Promise.all(
    payments.map(async (payment) => ({
      payment,
      split: await getPersistedSplitAmounts(payment.id, payment.amount),
    })),
  );
  const paymentUnavailableReason = paymentRuntime.ready
    ? undefined
    : "Online payment is not currently enabled for your Chapter. Your balance and payment history remain available; please contact your Chapter Administrator for payment setup assistance.";
  const methodLabel = paymentRuntime.ready
    ? paymentRuntime.methods.map((method) => method === "paymaya" ? "Maya" : method === "qrph" ? "QR Ph" : method === "gcash" ? "GCash" : method).join(", ")
    : "Not available";

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Payments</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Home</Link>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div className="app-greeting">
          <p>Member Finance</p>
          <h1>Dues, Contributions & Payments</h1>
          <p style={{ marginTop: 8, maxWidth: 760, color: "#746b5b", lineHeight: 1.55 }}>
            View your exact Chapter balance, choose a payable assessment, review the PSP convenience fee before confirmation, and access digital receipts after PayMongo webhook confirmation.
          </p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginBottom: 18 }}>
          <Metric label="Outstanding Balance" value={php(balance)} emphasis={balance.gt(0)} />
          <Metric label="Total Contributions" value={php(totalContributions)} />
          <Metric label="Chapter Payments" value={php(totalChapterPaid)} />
        </section>

        <section className="app-panel" style={{ marginBottom: 18, border: paymentRuntime.ready ? "1px solid #bcdcbc" : "1px solid #ebd594", background: paymentRuntime.ready ? "#f7fcf7" : "#fffaf0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <small style={{ fontWeight: 900, color: paymentRuntime.ready ? "#245b2a" : "#684d00" }}>{paymentRuntime.ready ? "ONLINE PAYMENT READY" : "ONLINE PAYMENT UNAVAILABLE"}</small>
              <h2 style={{ margin: "5px 0 5px" }}>Secure Chapter Payment</h2>
              <p style={{ color: "#6b665c", margin: 0, lineHeight: 1.55 }}>
                Chapter: <strong>{member.chapter.name}</strong>. Available methods: <strong>{methodLabel}</strong>. A PSP platform convenience fee is shown separately before final confirmation and is not credited as Chapter dues.
              </p>
              {paymentUnavailableReason ? <p style={{ margin: "10px 0 0", color: "#684d00", lineHeight: 1.5 }}>{paymentUnavailableReason}</p> : null}
            </div>
            <Link href="/payments/receipts" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>My Receipts</Link>
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <h2>Outstanding Dues & Assessments</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            {assessments.map((assessment) => {
              const amount = outstanding.get(assessment.id) ?? new Prisma.Decimal(0);
              const category = categoryForAssessment(assessment.assessmentType.code);
              return (
                <article className="app-panel" key={assessment.id} style={{ display: "grid", gap: 12 }}>
                  <div>
                    <small style={{ color: "#806500", fontWeight: 900 }}>{category} · {assessment.assessmentType.name}</small>
                    <h3 style={{ margin: "5px 0 0" }}>{assessment.title}</h3>
                  </div>
                  <div data-member-amount-to-pay={amount.toFixed(2)}>
                    <small style={{ color: "#746b5b", fontWeight: 800 }}>Amount to Pay</small>
                    <strong style={{ display: "block", fontSize: "1.55rem" }}>{php(amount)}</strong>
                    <small style={{ color: "#746b5b" }}>This is the Chapter/National dues amount before the separately disclosed PSP convenience fee.</small>
                  </div>
                  {assessment.dueAt ? (
                    <small style={{ color: "#6b665c" }}>
                      Due {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(assessment.dueAt)}
                    </small>
                  ) : null}
                  <PayButton assessmentId={assessment.id} outstanding={amount.toFixed(2)} category={category} disabledReason={paymentUnavailableReason} />
                </article>
              );
            })}
            {assessments.length === 0 ? (
              <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No outstanding payable assessment.</p></div>
            ) : null}
          </div>
        </section>

        <section className="app-panel" style={{ marginBottom: 22 }}>
          <h2>Contribution or Other Payment</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.55 }}>
            Enter the Chapter amount and purpose. The platform convenience fee is calculated and displayed separately before payment.
          </p>
          <OtherPaymentForm disabledReason={paymentUnavailableReason} />
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Recent Payment History</h2>
            <Link href="/payments/receipts" style={{ fontWeight: 800 }}>Receipts</Link>
          </div>
          <div style={{ display: "grid", gap: 11 }}>
            {paymentRows.map(({ payment, split }) => (
              <article key={payment.id} className="app-panel" style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <small style={{ color: "#806500", fontWeight: 900 }}>{payment.category}</small>
                    <h3 style={{ margin: "4px 0 6px", fontSize: "1rem" }}>{payment.assessment?.title ?? payment.description ?? "PSP Payment"}</h3>
                    <div style={{ color: "#6b665c", fontSize: ".82rem", lineHeight: 1.5 }}>
                      {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(payment.paidAt ?? payment.createdAt)}<br />
                      {split.paymentMethod?.toUpperCase() ?? "PAYMONGO"} · {payment.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                    <strong style={{ display: "block" }}>{php(split.totalAmount)}</strong>
                    <small style={{ color: "#6b665c" }}>Chapter {php(split.chapterAmount)}</small>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee7d8", fontSize: ".82rem" }}>
                  <span>Platform fee {php(split.platformFee)}</span>
                  {payment.receipt ? <Link href={`/payments/receipts/${payment.receipt.id}`}>Receipt {payment.receipt.receiptNumber}</Link> : <span>No receipt yet</span>}
                </div>
              </article>
            ))}
            {paymentRows.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No payment history yet.</p></div> : null}
          </div>
        </section>
      </div>

      <nav className="app-bottom-nav" aria-label="Member mobile navigation">
        <Link href="/member">Home</Link>
        <Link href="/member/id">Digital ID</Link>
        <Link className="active" href="/payments">Payments</Link>
        <Link href="/payments/receipts">Receipts</Link>
        <Link href="/profile">More</Link>
      </nav>
    </main>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="app-panel" style={{ padding: 15 }}>
      <small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 7, fontSize: "1.35rem", color: emphasis ? "#8a6500" : "#151515" }}>{value}</strong>
    </div>
  );
}
