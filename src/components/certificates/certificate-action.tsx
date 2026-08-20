"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CertificateAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function issue() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/member/certificates", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Unable to issue certificate.");
      setMessage(payload.created ? "Certificate issued successfully." : "Your valid certificate is already available.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to issue certificate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary" type="button" onClick={issue} disabled={busy}>
        {busy ? "Issuing…" : "Issue My Certificate"}
      </button>
      {message && <p role="status" style={{ marginTop: 10, fontSize: ".86rem", color: "#6b665c" }}>{message}</p>}
    </div>
  );
}
