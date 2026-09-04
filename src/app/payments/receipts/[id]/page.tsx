import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { php } from "@/lib/finance/ledger";
import { getPersistedSplitAmounts } from "@/lib/paymongo/split-metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      payment: {
        include: {
          assessment: { select: { title: true } },
          chapter: { select: { name: true } },
          member: {
            select: {
              id: true,
              firstName: true,
              middleInitial: true,
              lastName: true,
              membershipNo: true,
            },
          },
        },
      },
    },
  });
  if (!receipt || receipt.payment.status !== "PAID") notFound();

  const owner = context.user.member?.id === receipt.payment.memberId;
  const finance = hasPermission(context, "finance.view", receipt.payment.chapterId);
  if (!owner && !finance) notFound();

  const split = await getPersistedSplitAmounts(receipt.payment.id, receipt.payment.amount);
  const memberName = [
    receipt.payment.member.firstName,
    receipt.payment.member.middleInitial,
    receipt.payment.member.lastName,
  ].filter(Boolean).join(" ");

  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 760 }}>
        <div className="app-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 72, height: 72, objectFit: "contain" }} />
            <div>
              <small style={{ color: "#806500", fontWeight: 900 }}>PSI SIGMA PHI PHILIPPINES INC.</small>
              <h1 style={{ margin: "5px 0 0" }}>Digital Payment Receipt</h1>
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 16, background: "#151515", color: "#fff", marginBottom: 18 }}>
            <small style={{ color: "#bbb" }}>Total Paid</small>
            <strong style={{ display: "block", marginTop: 5, color: "#fec009", fontSize: "2rem" }}>{php(split.totalAmount)}</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 14, fontSize: ".88rem" }}>
              <span>Chapter amount</span><strong>{php(split.chapterAmount)}</strong>
              <span>Platform convenience fee</span><strong>{php(split.platformFee)}</strong>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <Info label="Receipt No." value={receipt.receiptNumber} />
            <Info label="Payment Type" value={receipt.payment.category.replaceAll("_", " ")} />
            <Info label="Member" value={memberName} />
            <Info label="Membership No." value={receipt.payment.member.membershipNo} />
            <Info label="Chapter" value={receipt.payment.chapter.name} />
            <Info label="Purpose" value={receipt.payment.assessment?.title ?? receipt.payment.description ?? "PSP Payment"} />
            <Info label="Payment Method" value={split.paymentMethod?.toUpperCase() ?? "PAYMONGO"} />
            <Info label="Internal Reference" value={receipt.payment.internalReference} />
            <Info label="PayMongo Intent" value={receipt.payment.gatewayReference ?? "Not available"} />
            <Info label="Confirmed" value={new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(receipt.payment.paidAt ?? receipt.issuedAt)} />
          </div>

          <p style={{ color: "#6b665c", lineHeight: 1.55, fontSize: ".84rem", marginTop: 18 }}>
            Only the chapter amount is posted to your chapter ledger. The platform convenience fee is separately disclosed and is not recorded as chapter dues, contribution, or other chapter income.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <a className="btn btn-primary" href={`/api/payments/receipts/${receipt.id}/pdf`}>Download PDF</a>
            <Link className="btn" href="/payments/receipts" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>All Receipts</Link>
            <Link className="btn" href="/payments" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Payments</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 13, border: "1px solid #e7e0d0", borderRadius: 13 }}>
      <small style={{ display: "block", color: "#746b5b", marginBottom: 5 }}>{label}</small>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
