"use client";

import { FormEvent, useEffect, useState } from "react";

type ApprovalStatus = {
  approved: boolean;
  approvedAt: string | null;
  approvedBy: { id: string; displayName: string; email: string } | null;
  notes: string | null;
  serverLiveEnabled: boolean;
  message?: string;
};

export function PayMongoLiveApprovalControl() {
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [testDues, setTestDues] = useState(false);
  const [testContribution, setTestContribution] = useState(false);
  const [webhookReceipt, setWebhookReceipt] = useState(false);
  const [notes, setNotes] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetch("/api/admin/finance/paymongo-live-approval", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as ApprovalStatus;
        if (!response.ok) throw new Error(payload.message ?? "Unable to load LIVE approval status.");
        if (!cancelled) setStatus(payload);
      })
      .catch((cause) => {
        if (!cancelled && (cause as Error).name !== "AbortError") {
          setError(cause instanceof Error ? cause.message : "Unable to load LIVE approval status.");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function approve(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/paymongo-live-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          testDuesPaymentVerified: testDues,
          testContributionPaymentVerified: testContribution,
          webhookAndReceiptVerified: webhookReceipt,
          notes,
        }),
      });
      const payload = (await response.json()) as ApprovalStatus;
      if (!response.ok) throw new Error(payload.message ?? "Unable to approve LIVE processing.");
      setStatus(payload);
      setMessage("National Admin TEST acceptance and LIVE approval recorded successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve LIVE processing.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (revokeReason.trim().length < 5) {
      setError("Enter a revocation reason of at least 5 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/paymongo-live-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "REVOKE", reason: revokeReason.trim() }),
      });
      const payload = (await response.json()) as ApprovalStatus;
      if (!response.ok) throw new Error(payload.message ?? "Unable to revoke LIVE approval.");
      setStatus(payload);
      setRevokeReason("");
      setMessage("LIVE approval revoked. New LIVE provider actions are blocked until re-approved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to revoke LIVE approval.");
    } finally {
      setBusy(false);
    }
  }

  const checklistComplete = testDues && testContribution && webhookReceipt;
  const approvedAt = status?.approvedAt
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(status.approvedAt))
    : null;

  return (
    <section className="app-panel" data-paymongo-live-approval-version="national-signoff-v1">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>PAYMONGO LIVE CONTROL</small>
          <h2 style={{ margin: "5px 0 6px" }}>TEST Acceptance & LIVE Approval</h2>
          <p style={{ margin: 0, maxWidth: 780, color: "#6b665c", lineHeight: 1.55 }}>
            This is the National Admin signoff that was previously missing from the PSP interface. LIVE provider actions require this approval and the separate Hostinger server LIVE kill-switch.
          </p>
        </div>
        <span style={{ padding: "7px 10px", borderRadius: 999, border: "1px solid #dfd7c6", fontSize: ".75rem", fontWeight: 900, background: status?.approved ? "#eaf7ec" : "#fff6dd", color: status?.approved ? "#245b2a" : "#684d00" }}>
          {busy && !status ? "CHECKING…" : status?.approved ? "NATIONAL APPROVAL · APPROVED" : "NATIONAL APPROVAL · PENDING"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 16 }}>
        <StatusCard label="National TEST Signoff" value={status?.approved ? "Approved" : "Pending"} ready={Boolean(status?.approved)} />
        <StatusCard label="Hostinger LIVE Kill-Switch" value={status?.serverLiveEnabled ? "ON" : "OFF"} ready={Boolean(status?.serverLiveEnabled)} />
        <StatusCard label="LIVE Provider Actions" value={status?.approved && status?.serverLiveEnabled ? "Ready" : "Blocked"} ready={Boolean(status?.approved && status?.serverLiveEnabled)} />
      </div>

      {status?.approved ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #bcdcbc", background: "#f3faf3" }}>
          <strong>National LIVE approval is recorded.</strong>
          <div style={{ marginTop: 5, color: "#52664f", lineHeight: 1.5 }}>
            {status.approvedBy ? <>Approved by <strong>{status.approvedBy.displayName}</strong> ({status.approvedBy.email})</> : "Approved by National Administration"}
            {approvedAt ? <> on <strong>{approvedAt}</strong></> : null}.
            {status.notes ? <><br />Notes: {status.notes}</> : null}
          </div>
        </div>
      ) : (
        <form onSubmit={approve} style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid #ead28c", background: "#fff9e9" }}>
            <strong>Confirm controlled TEST acceptance</strong>
            <p style={{ margin: "5px 0 10px", color: "#6b665c", lineHeight: 1.5 }}>Only approve after the TEST evidence has actually been completed. This action is recorded in the PSP audit log.</p>
            <Checklist checked={testDues} onChange={setTestDues} label="TEST dues payment completed and expected split amounts verified." />
            <Checklist checked={testContribution} onChange={setTestContribution} label="TEST contribution/other payment completed and expected split amounts verified." />
            <Checklist checked={webhookReceipt} onChange={setWebhookReceipt} label="TEST child webhook, payment status and PSP receipt/reconciliation verified." />
          </div>
          <label style={{ display: "grid", gap: 6 }}><strong>Approval notes (optional)</strong><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="Reference the TEST evidence or acceptance date." style={{ width: "100%", border: "1px solid #d8d0bf", borderRadius: 10, padding: 10, font: "inherit" }} /></label>
          <button className="btn btn-primary" type="submit" disabled={busy || !checklistComplete} style={{ minHeight: 46 }}>{busy ? "Recording approval…" : "Approve LIVE after TEST signoff"}</button>
        </form>
      )}

      {status?.approved && !status.serverLiveEnabled ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #ead28c", background: "#fff9e9" }}>
          <strong>One server control remains: PAYMONGO_LIVE_ENABLED</strong>
          <ol style={{ margin: "8px 0", paddingLeft: 22, color: "#6b665c", lineHeight: 1.55 }}>
            <li>Open Hostinger hPanel → psp.hoahub.tech → production Environment Variables.</li>
            <li>Set <code>PAYMONGO_LIVE_ENABLED</code> to <code>true</code>.</li>
            <li>Save and redeploy/restart the web app.</li>
            <li>Return to Finance and re-check activation readiness.</li>
          </ol>
          <a className="btn" href="https://hpanel.hostinger.com/" target="_blank" rel="noreferrer" style={{ border: "1px solid #d8b45c", background: "#fff" }}>Open Hostinger hPanel</a>
        </div>
      ) : null}

      {status?.approved ? (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e4ddcf" }}>
          <strong>Emergency / governance revoke</strong>
          <p style={{ margin: "5px 0 9px", color: "#6b665c" }}>Revoking the National approval blocks new LIVE provider actions. Existing payment/webhook records remain auditable.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} placeholder="Reason for revocation" maxLength={500} style={{ flex: "1 1 320px", minHeight: 42, border: "1px solid #d8d0bf", borderRadius: 10, padding: "8px 10px" }} />
            <button className="btn" type="button" onClick={revoke} disabled={busy} style={{ border: "1px solid #c98f8f", background: "#fff5f5" }}>Revoke LIVE approval</button>
          </div>
        </div>
      ) : null}

      {message ? <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#eef8ee", border: "1px solid #bcdcbc" }}>{message}</div> : null}
      {error ? <div role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff1f1", border: "1px solid #e3aaaa", color: "#8a2525" }}>{error}</div> : null}
    </section>
  );
}

function Checklist({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 8 }}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={{ width: 20, height: 20, marginTop: 1 }} /><span>{label}</span></label>;
}

function StatusCard({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e4ddcf", background: ready ? "#f3faf3" : "#faf8f2" }}><small style={{ display: "block", color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 3 }}>{value}</strong></div>;
}
