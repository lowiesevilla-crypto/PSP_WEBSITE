"use client";

import { FormEvent, useState } from "react";

export function OtherPaymentForm() {
  const [category, setCategory] = useState<"CONTRIBUTION" | "OTHER">("CONTRIBUTION");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description,
          requestId: crypto.randomUUID(),
        }),
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
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Payment Type</strong>
        <select value={category} onChange={(event) => setCategory(event.target.value as "CONTRIBUTION" | "OTHER")} style={fieldStyle}>
          <option value="CONTRIBUTION">Contribution</option>
          <option value="OTHER">Other Payment</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Amount (PHP)</strong>
        <input type="number" inputMode="decimal" min="1" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required style={fieldStyle} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Description / Purpose</strong>
        <input value={description} onChange={(event) => setDescription(event.target.value)} minLength={3} maxLength={255} required placeholder={category === "CONTRIBUTION" ? "e.g. Chapter anniversary contribution" : "e.g. Merchandise / other approved payment"} style={fieldStyle} />
      </label>
      {error ? <div role="alert" style={{ padding: 10, borderRadius: 10, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Opening PayMongo…" : "Continue to Secure Payment"}</button>
    </form>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  border: "1px solid #ddd5c1",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  font: "inherit",
};
