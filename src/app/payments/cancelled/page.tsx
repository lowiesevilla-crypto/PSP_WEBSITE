import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <main className="app-shell">
      <div className="container app-main" style={{ paddingTop: 56 }}>
        <div className="app-panel" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px", background: "#f4f0e5", fontSize: "1.5rem" }}>×</div>
          <h1>Payment Not Completed</h1>
          <p style={{ color: "#6b665c", lineHeight: 1.65 }}>
            PSP has not marked the assessment as paid. If PayMongo later sends a valid payment confirmation for a completed transaction, the ledger will update automatically; otherwise the balance remains outstanding.
          </p>
          <Link className="btn btn-primary" href="/payments">Return to Payments</Link>
        </div>
      </div>
    </main>
  );
}
