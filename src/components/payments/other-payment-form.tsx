"use client";

import { useState } from "react";
import { SplitPaymentAction } from "@/components/payments/split-payment-action";

export function OtherPaymentForm() {
  const [category, setCategory] = useState<"CONTRIBUTION" | "OTHER">("CONTRIBUTION");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const validDescription = description.trim().length >= 3;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Payment Type</strong>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as "CONTRIBUTION" | "OTHER")}
          style={fieldStyle}
        >
          <option value="CONTRIBUTION">Contribution</option>
          <option value="OTHER">Other Payment</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Chapter Amount (PHP)</strong>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          max="10000000"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <strong>Description / Purpose</strong>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          minLength={3}
          maxLength={255}
          required
          placeholder={category === "CONTRIBUTION" ? "e.g. Chapter anniversary contribution" : "e.g. Merchandise / other approved payment"}
          style={fieldStyle}
        />
      </label>
      <p style={{ margin: 0, color: "#6b665c", fontSize: ".84rem", lineHeight: 1.5 }}>
        A separately disclosed PSP platform convenience fee will be added before you confirm payment. The chapter amount above is the amount credited to your chapter record.
      </p>
      <SplitPaymentAction
        category={category}
        chapterAmount={validAmount ? Number(amount).toFixed(2) : "0.00"}
        description={description.trim()}
        disabled={!validAmount || !validDescription}
      />
    </div>
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
