"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PaymentMethod = "qrph" | "gcash" | "paymaya";
type Preview = { chapterAmount: string; platformFee: string; totalAmount: string };
type CheckoutResponse = Preview & {
  paymentId: string;
  internalReference: string;
  paymentMethod: PaymentMethod;
  status: string;
  actionType: "redirect" | "qr" | "none";
  actionUrl: string | null;
  qrImageUrl: string | null;
  testUrl?: string | null;
  message?: string;
};

type StatusResponse = {
  payment?: {
    status: string;
    chapterAmount: string;
    platformFee: string;
    totalAmount: string;
    receipt?: { id: string; receiptNumber: string } | null;
  };
  message?: string;
};

export function SplitPaymentAction({
  category,
  chapterAmount,
  assessmentId,
  description,
  disabled = false,
}: {
  category: "DUES" | "CONTRIBUTION" | "OTHER";
  chapterAmount: string;
  assessmentId?: string;
  description?: string;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("qrph");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; receiptNumber: string } | null>(null);

  const validAmount = useMemo(() => {
    const value = Number(chapterAmount);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [chapterAmount]);

  useEffect(() => {
    setPreview(null);
    setError(null);
    if (!validAmount) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/payments/fee-preview?amount=${encodeURIComponent(validAmount.toFixed(2))}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as (Preview & { message?: string }) | null;
        if (!response.ok || !payload?.totalAmount) throw new Error(payload?.message ?? "Unable to calculate payment total.");
        setPreview(payload);
      } catch (cause) {
        if ((cause as Error).name !== "AbortError") setError(cause instanceof Error ? cause.message : "Unable to calculate payment total.");
      }
    };
    void load();
    return () => controller.abort();
  }, [validAmount]);

  useEffect(() => {
    const ref = checkout?.internalReference;
    if (!ref || checkout.actionType === "redirect" || paymentStatus === "PAID" || paymentStatus === "FAILED") return;

    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/status?ref=${encodeURIComponent(ref)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as StatusResponse | null;
        if (!stopped && response.ok && payload?.payment) {
          setPaymentStatus(payload.payment.status);
          setReceipt(payload.payment.receipt ?? null);
          if (!["PAID", "FAILED", "CANCELLED"].includes(payload.payment.status)) {
            window.setTimeout(() => void poll(), 3000);
          }
        } else if (!stopped) {
          window.setTimeout(() => void poll(), 4000);
        }
      } catch {
        if (!stopped) window.setTimeout(() => void poll(), 5000);
      }
    };
    const timer = window.setTimeout(() => void poll(), 2500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [checkout?.internalReference, checkout?.actionType, paymentStatus]);

  async function startPayment() {
    if (!preview || !validAmount || disabled || busy) return;
    const confirmed = window.confirm(
      `Confirm payment\n\nChapter amount: ₱${money(preview.chapterAmount)}\nPlatform convenience fee: ₱${money(preview.platformFee)}\nTotal to pay: ₱${money(preview.totalAmount)}\n\nThe platform fee is separate from your chapter dues/contribution.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setCheckout(null);
    setPaymentStatus(null);
    setReceipt(null);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          category,
          paymentMethod: method,
          assessmentId,
          amount: assessmentId ? undefined : validAmount,
          description: assessmentId ? undefined : description,
          requestId: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok || !payload?.internalReference) {
        throw new Error(payload?.message ?? "Unable to start secure payment.");
      }
      setCheckout(payload);
      setPaymentStatus(payload.status);
      if (payload.actionType === "redirect" && payload.actionUrl) {
        window.location.assign(payload.actionUrl);
        return;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start secure payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }} aria-label="Payment method">
        {(["qrph", "gcash", "paymaya"] as PaymentMethod[]).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setMethod(item)}
            disabled={busy}
            aria-pressed={method === item}
            style={{
              minHeight: 46,
              borderRadius: 12,
              border: method === item ? "2px solid #151515" : "1px solid #ddd5c1",
              background: method === item ? "#fec009" : "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {item === "qrph" ? "QR Ph" : item === "paymaya" ? "Maya" : "GCash"}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 14, padding: 12, background: "#f7f2e5", display: "grid", gap: 5, fontSize: ".9rem" }}>
        <AmountRow label="Chapter amount" value={preview?.chapterAmount ?? chapterAmount} />
        <AmountRow label="Platform convenience fee" value={preview?.platformFee ?? "—"} />
        <div style={{ borderTop: "1px solid #ddd5c1", marginTop: 4, paddingTop: 7 }}>
          <AmountRow label="Total to pay" value={preview?.totalAmount ?? "—"} strong />
        </div>
      </div>

      <button className="btn btn-primary" type="button" disabled={disabled || busy || !preview} onClick={() => void startPayment()} style={{ width: "100%", minHeight: 50 }}>
        {busy ? "Preparing secure payment…" : preview ? `Pay ₱${money(preview.totalAmount)}` : "Calculating total…"}
      </button>

      {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

      {checkout?.actionType === "qr" && checkout.qrImageUrl ? (
        <section style={{ border: "1px solid #ddd5c1", borderRadius: 16, padding: 16, textAlign: "center", background: "#fff" }} aria-live="polite">
          <strong style={{ display: "block", marginBottom: 5 }}>Scan QR Ph to complete payment</strong>
          <span style={{ display: "block", color: "#6b665c", fontSize: ".85rem", marginBottom: 12 }}>Total ₱{money(checkout.totalAmount)} · Status: {paymentStatus ?? "PROCESSING"}</span>
          <img src={checkout.qrImageUrl} alt="PayMongo QR Ph payment code" style={{ width: "min(280px, 100%)", aspectRatio: "1", objectFit: "contain" }} />
          {checkout.testUrl ? <a href={checkout.testUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: ".82rem" }}>Open PayMongo test helper</a> : null}
          {paymentStatus === "PAID" ? <div style={successStyle}>Payment confirmed.{receipt ? <> <Link href={`/payments/receipts/${receipt.id}`}>View receipt {receipt.receiptNumber}</Link>.</> : null}</div> : null}
          {paymentStatus === "FAILED" ? <div style={errorStyle}>Payment was not completed. You may try again.</div> : null}
        </section>
      ) : null}

      {checkout?.actionType === "none" && checkout ? (
        <div role="status" style={paymentStatus === "PAID" ? successStyle : { color: "#6b665c", fontSize: ".88rem" }}>
          {paymentStatus === "PAID" ? "Payment confirmed." : `Payment status: ${paymentStatus ?? checkout.status}. Waiting for PayMongo confirmation.`}
        </div>
      ) : null}
    </div>
  );
}

function AmountRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>{label}</span><span style={{ fontWeight: strong ? 900 : 700 }}>{value === "—" ? value : `₱${money(value)}`}</span></div>;
}

function money(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
}

const errorStyle: React.CSSProperties = { padding: 11, borderRadius: 11, background: "#fff1f1", color: "#7b2424", border: "1px solid #e8b5b5" };
const successStyle: React.CSSProperties = { marginTop: 10, padding: 11, borderRadius: 11, background: "#eef8ef", color: "#245b2a", border: "1px solid #bcdcbc" };
