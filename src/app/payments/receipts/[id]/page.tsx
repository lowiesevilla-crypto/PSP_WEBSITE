import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { php } from "@/lib/finance/ledger";
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
          member: { select: { id: true, firstName: true, middleInitial: true, lastName: true, membershipNo: true } },
        },
      },
    },
  });
  if (!receipt || receipt.payment.status !== "PAID") notFound();

  const owner = context.user.member?.id === receipt.payment.memberId;
  const finance = hasPermission(context, "finance.view", receipt.payment.chapterId);
  if (!owner && !finance) notFound();

  const memberName = [receipt.payment.member.firstName, receipt.payment.member.middleInitial, receipt.payment.member.lastName].filter(Boolean).join(" ");

  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 760 }}>
        <div className="app-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 72, height: 72, objectFit: "contain" }} />
            <div><small style={{ color: "#806500", fontWeight: 900 }}>PSI SIGMA PHI PHILIPPINES INC.</small><h1 style={{ margin: "5px 0 0" }}>Digital Payment Receipt</h1></div>
          </div>
          <div style={{ padding: 16, borderRadius: 16, background: "#151515", color: "#fff", marginBottom: 18 }}>
            <small style={{ color: "#bbb" }}>Amount Paid</small>
            <strong style={{ display: "block", marginTop: 5, color: "#fec009", fontSize: "2rem" }}>{php(receipt.payment.amount)}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <Info label="Receipt No." value={receipt.receiptNumber} />
            <Info label="Member" value={memberName} />
            <Info label="Membership No." value={receipt.payment.member.membershipNo} />
            <Info label="Chapter" value={receipt.payment.chapter.name} />
            <Info label="Assessment" value={receipt.payment.assessment?.title ?? "PSP Payment"} />
            <Info label="Internal Reference" value={receipt.payment.internalReference} />
            <Info label="PayMongo Reference" value={receipt.payment.gatewayReference ?? "Not available"} />
            <Info label="Confirmed" value={new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(receipt.payment.paidAt ?? receipt.issuedAt)} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <a className="btn btn-primary" href={`/api/payments/receipts/${receipt.id}/pdf`}>Download PDF</a>
            <Link className="btn" href="/payments" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Back to Payments</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 13, border: "1px solid #e7e0d0", borderRadius: 13 }}><small style={{ display: "block", color: "#746b5b", marginBottom: 5 }}>{label}</small><strong style={{ overflowWrap: "anywhere" }}>{value}</strong></div>;
}
