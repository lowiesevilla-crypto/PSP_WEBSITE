"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BalanceActions({ memberId, memberName, balance }: { memberId: string; memberName: string; balance: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"adjust" | "writeoff" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(mode: "ADJUST" | "WRITE_OFF") {
    if (busy) return;
    const writeOff = mode === "WRITE_OFF";
    const amount = writeOff ? undefined : window.prompt("Adjustment amount. Use negative amount to reduce the balance.", "0.00");
    if (!writeOff && amount === null) return;
    const remarks = window.prompt(writeOff ? `Write off full balance for ${memberName}? Add remarks:` : "Adjustment remarks:", writeOff ? "Balance write-off approved by administrator." : "Manual balance adjustment.");
    if (!remarks) return;
    if (writeOff && !window.confirm(`Write off current balance ${balance} for ${memberName}? This posts an audited adjustment and keeps history.`)) return;

    setBusy(writeOff ? "writeoff" : "adjust");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/finance/member-balances/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, amount: amount ? Number(amount) : undefined, remarks }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? "Unable to update balance.");
        return;
      }
      setMessage(`New balance: ${payload.newBalance}`);
      router.refresh();
    } catch {
      setMessage("Unable to update balance because the server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-table-actions" data-balance-actions-version="adjust-writeoff-v1">
      <button type="button" className="btn" onClick={() => submit("ADJUST")} disabled={busy !== null} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>
        {busy === "adjust" ? "Saving..." : "Adjust"}
      </button>
      <button type="button" className="btn" onClick={() => submit("WRITE_OFF")} disabled={busy !== null} style={{ border: "1px solid #f0b4aa", background: "#fff1f0", color: "#8b1e1e" }}>
        {busy === "writeoff" ? "Writing off..." : "Write Off"}
      </button>
      {message ? <small role="status" style={{ color: message.startsWith("Unable") ? "#8b1e1e" : "#245b2a", fontWeight: 800 }}>{message}</small> : null}
    </div>
  );
}
