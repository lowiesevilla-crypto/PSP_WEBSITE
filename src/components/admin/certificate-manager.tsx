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
    setMessage(response.ok ? (payload.created ? `Issued · Email ${payload.emailDelivery ?? "processed"}` : "Already valid") : payload.message ?? "Unable to issue");
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

export function DeleteCertificateButton({ certificateId, certificateNumber }: { certificateId: string; certificateNumber: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function invalidate() {
    const confirmed = window.confirm(`Delete ${certificateNumber} from active certificates and mark it INVALID?\n\nThe issued record will be retained for audit. Its QR verification and PDF will no longer be valid.`);
    if (!confirmed) return;
    const reason = window.prompt("Optional invalidation reason:", "Deleted and invalidated by an authorized administrator.");
    if (reason === null) return;

    setBusy(true);
    const response = await fetch("/api/admin/certificates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateId, reason: reason.trim() || undefined }),
    });
    setBusy(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.alert(payload.message ?? "Unable to delete and invalidate certificate.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      className="btn"
      type="button"
      onClick={invalidate}
      disabled={busy}
      style={{ border: "1px solid #df9f9f", background: "#fff1f1", color: "#7b2424", fontWeight: 800 }}
      title="Remove from active certificates and permanently mark the QR verification invalid"
    >
      {busy ? "Invalidating…" : "Delete / Invalidate"}
    </button>
  );
}
