import Link from "next/link";
import { redirect } from "next/navigation";
import { php } from "@/lib/finance/ledger";
import { requireCurrentMember } from "@/lib/member/current-member";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MemberReceiptsPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const receipts = await prisma.receipt.findMany({
    where: { payment: { memberId: member.id, status: "PAID" } },
    orderBy: { issuedAt: "desc" },
    take: 250,
    include: {
      payment: {
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          internalReference: true,
          paidAt: true,
          assessment: { select: { title: true } },
        },
      },
    },
  });

  const audits = receipts.length
    ? await prisma.auditLog.findMany({
        where: {
          action: SPLIT_PAYMENT_AUDIT_ACTION,
          entityType: "Payment",
          entityId: { in: receipts.map((receipt) => receipt.payment.id) },
        },
        orderBy: { createdAt: "desc" },
        select: { entityId: true, metadataJson: true },
      })
    : [];
  const metadataByPayment = new Map<string, unknown>();
  for (const audit of audits) {
    if (audit.entityId && !metadataByPayment.has(audit.entityId)) metadataByPayment.set(audit.entityId, audit.metadataJson);
  }

  return (
    <main className="app-shell">
      <header className="app-topbar"><div className="container app-nav"><Link className="app-brand" href="/member"><img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" /><span>My Receipts</span></Link><Link href="/payments" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Payments</Link></div></header>
      <div className="container app-main" style={{ maxWidth: 900 }}>
        <div className="app-greeting"><p>Member Finance</p><h1>Digital Receipts</h1></div>
        <section style={{ display: "grid", gap: 12 }}>
          {receipts.map((receipt) => {
            const split = splitAmountsFromMetadata(metadataByPayment.get(receipt.payment.id), receipt.payment.amount);
            return (
              <article key={receipt.id} className="app-panel" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <small style={{ color: "#806500", fontWeight: 900 }}>{receipt.payment.category}</small>
                  <h2 style={{ margin: "4px 0 7px", fontSize: "1.08rem" }}>{receipt.payment.assessment?.title ?? receipt.payment.description ?? "PSP Payment"}</h2>
                  <div style={{ color: "#6b665c", fontSize: ".83rem", lineHeight: 1.55 }}>
                    Receipt {receipt.receiptNumber}<br />
                    {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(receipt.payment.paidAt ?? receipt.issuedAt)}<br />
                    Chapter {php(split.chapterAmount)} · Fee {php(split.platformFee)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small style={{ color: "#6b665c" }}>Total paid</small>
                  <strong style={{ display: "block", fontSize: "1.15rem", margin: "3px 0 8px" }}>{php(split.totalAmount)}</strong>
                  <Link href={`/payments/receipts/${receipt.id}`} className="btn btn-primary">View</Link>
                </div>
              </article>
            );
          })}
          {receipts.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No confirmed payment receipts yet.</p></div> : null}
        </section>
      </div>
      <nav className="app-bottom-nav" aria-label="Member mobile navigation">
        <Link href="/member">Home</Link><Link href="/member/id">Digital ID</Link><Link href="/payments">Payments</Link><Link className="active" href="/payments/receipts">Receipts</Link><Link href="/profile">More</Link>
      </nav>
    </main>
  );
}
