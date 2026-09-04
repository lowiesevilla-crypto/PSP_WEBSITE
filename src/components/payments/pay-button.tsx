"use client";

import { useState } from "react";

export function PayButton({
  assessmentId,
  outstanding,
  category,
}: {
  assessmentId: string;
  outstanding: string;
  category: "DUES" | "CONTRIBUTION" | "OTHER";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ category, assessmentId, requestId: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { checkoutUrl?: string; message?: string };
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.message ?? "Unable to start payment.");
      window.location.assign(payload.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start payment.");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void pay()} style={{ width: "100%" }}>
        {busy ? "Opening PayMongo…" : `Pay ₱${Number(outstanding).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
      </button>
      {error ? <small role="alert" style={{ color: "#7b2424" }}>{error}</small> : null}
    </div>
  );
}
