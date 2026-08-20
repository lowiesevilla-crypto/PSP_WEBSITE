"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueCertificateButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function issue() {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/admin/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(response.ok ? (payload.created ? "Issued" : "Already valid") : payload.message ?? "Unable to issue");
    if (response.ok) router.refresh();
  }
  return <div><button className="btn" type="button" onClick={issue} disabled={busy} style={{ border: "1px solid #ddd5c1", background: "white" }}>{busy ? "Issuing…" : "Issue"}</button>{message && <small style={{ marginLeft: 8 }}>{message}</small>}</div>;
}

export function RevokeCertificateButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function revoke() {
    const reason = window.prompt("Enter the revocation reason. This action is audited and preserves the certificate history.");
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    const response = await fetch("/api/admin/certificates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certificateId, reason: reason.trim() }) });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      window.alert(payload.message ?? "Unable to revoke certificate.");
      return;
    }
    router.refresh();
  }
  return <button className="btn" type="button" onClick={revoke} disabled={busy} style={{ border: "1px solid #e5b7b7", background: "#fff7f7" }}>{busy ? "Revoking…" : "Revoke"}</button>;
}
