"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function PaymentReturnStatus({ reference }: { reference: string }) {
  const [status, setStatus] = useState<string>("PROCESSING");
  const [receipt, setReceipt] = useState<{ id: string; receiptNumber: string } | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!reference || status === "PAID" || attempts >= 12) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/payments/status?ref=${encodeURIComponent(reference)}`, { cache: "no-store" });
        const payload = (await response.json()) as { payment?: { status: string; receipt?: { id: string; receiptNumber: string } | null } };
        if (response.ok && payload.payment) {
          setStatus(payload.payment.status);
          setReceipt(payload.payment.receipt ?? null);
        }
      } finally {
        setAttempts((value) => value + 1);
      }
    }, attempts === 0 ? 400 : 2000);
    return () => window.clearTimeout(timer);
  }, [reference, status, attempts]);

  const confirmed = status === "PAID";

  return (
    <div className="app-panel" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px", background: confirmed ? "#e8f6ea" : "#fff3c4", fontSize: "1.6rem" }}>
        {confirmed ? "✓" : "…"}
      </div>
      <h1>{confirmed ? "Payment Confirmed" : "Confirming Your Payment"}</h1>
      <p style={{ color: "#6b665c", lineHeight: 1.65 }}>
        {confirmed
          ? "PayMongo has confirmed the payment and the PSP member ledger has been updated."
          : "Your browser return is not treated as proof of payment. PSP is waiting for secure server confirmation from PayMongo."}
      </p>
      <p><strong>Status:</strong> {status}</p>
      {receipt ? <p><Link href={`/payments/receipts/${receipt.id}`}>Open receipt {receipt.receiptNumber}</Link></p> : null}
      {!confirmed && attempts >= 12 ? <p style={{ color: "#6b665c" }}>Confirmation is taking longer than expected. You can safely return to Payments and refresh later; PSP will post the transaction only after verified gateway confirmation.</p> : null}
      <Link className="btn btn-primary" href="/payments">Return to Payments</Link>
    </div>
  );
}
