import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, PaymentCategory } from "@prisma/client";
import { OtherPaymentForm } from "@/components/payments/other-payment-form";
import { PayButton } from "@/components/payments/pay-button";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
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

  const [entries, payments] = await Promise.all([
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
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginBottom: 18 }}>
          <Metric label="Outstanding Balance" value={php(balance)} emphasis={balance.gt(0)} />
          <Metric label="Total Contributions" value={php(totalContributions)} />
          <Metric label="Chapter Payments" value={php(totalChapterPaid)} />
        </section>

        <section className="app-panel" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Secure Online Payment</h2>
              <p style={{ color: "#6b665c", margin: "7px 0 0", lineHeight: 1.55 }}>
                Chapter: <strong>{member.chapter.name}</strong>. QR Ph, GCash and Maya are processed through PayMongo. A platform convenience fee is shown separately before final confirmation.
              </p>
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
                  <div>
                    <small style={{ color: "#746b5b" }}>Chapter amount due</small>
                    <strong style={{ display: "block", fontSize: "1.55rem" }}>{php(amount)}</strong>
                  </div>
                  {assessment.dueAt ? (
                    <small style={{ color: "#6b665c" }}>
                      Due {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(assessment.dueAt)}
                    </small>
                  ) : null}
                  <PayButton assessmentId={assessment.id} outstanding={amount.toFixed(2)} category={category} />
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
            Enter the chapter amount and purpose. The platform convenience fee is calculated and displayed separately before payment.
          </p>
          <OtherPaymentForm />
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
