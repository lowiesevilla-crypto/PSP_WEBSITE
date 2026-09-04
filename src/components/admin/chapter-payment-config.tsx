"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Chapter = { id: string; name: string };
type Method = "card" | "gcash" | "paymaya" | "qrph";
type ConfigPayload = {
  config: null | {
    mode: "TEST" | "LIVE";
    paymentMethods: unknown;
    isEnabled: boolean;
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
  };
  webhookUrl?: string;
  liveGloballyEnabled?: boolean;
  message?: string;
};

const methods: Array<{ code: Method; label: string }> = [
  { code: "qrph", label: "QR Ph" },
  { code: "gcash", label: "GCash" },
  { code: "paymaya", label: "Maya" },
  { code: "card", label: "Card" },
];

export function ChapterPaymentConfig({ chapters }: { chapters: Chapter[] }) {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [mode, setMode] = useState<"TEST" | "LIVE">("TEST");
  const [selectedMethods, setSelectedMethods] = useState<Method[]>(["qrph"]);
  const [enabled, setEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [liveGloballyEnabled, setLiveGloballyEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentChapter = useMemo(() => chapters.find((chapter) => chapter.id === chapterId), [chapters, chapterId]);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetch(`/api/admin/finance/payment-config?chapterId=${encodeURIComponent(chapterId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as ConfigPayload;
        if (!response.ok) throw new Error(payload.message ?? "Unable to load payment configuration.");
        if (cancelled) return;
        const config = payload.config;
        setMode(config?.mode === "LIVE" ? "LIVE" : "TEST");
        setEnabled(Boolean(config?.isEnabled));
        setHasSecretKey(Boolean(config?.hasSecretKey));
        setHasWebhookSecret(Boolean(config?.hasWebhookSecret));
        const configuredMethods = Array.isArray(config?.paymentMethods)
          ? config.paymentMethods.filter((value): value is Method => methods.some((method) => method.code === value))
          : ["qrph" as Method];
        setSelectedMethods(configuredMethods.length ? configuredMethods : ["qrph"]);
        setWebhookUrl(payload.webhookUrl ?? "");
        setLiveGloballyEnabled(Boolean(payload.liveGloballyEnabled));
        setSecretKey("");
        setWebhookSecret("");
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load payment configuration."))
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
  }, [chapterId]);

  function toggleMethod(method: Method) {
    setSelectedMethods((current) => current.includes(method) ? current.filter((item) => item !== method) : [...current, method]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!chapterId || selectedMethods.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/payment-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          chapterId,
          mode,
          secretKey: secretKey || undefined,
          webhookSecret: webhookSecret || undefined,
          paymentMethods: selectedMethods,
          isEnabled: enabled,
        }),
      });
      const payload = (await response.json()) as ConfigPayload;
      if (!response.ok) throw new Error(payload.message ?? "Unable to save payment configuration.");
      setHasSecretKey(true);
      setHasWebhookSecret(true);
      setWebhookUrl(payload.webhookUrl ?? webhookUrl);
      setSecretKey("");
      setWebhookSecret("");
      setMessage(`${currentChapter?.name ?? "Chapter"} PayMongo configuration saved securely.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save payment configuration.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) return null;

  return (
    <section className="app-panel" style={{ marginTop: 18 }}>
      <h2>Chapter Online Payment Gateway</h2>
      <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
        Each chapter owns its PayMongo configuration. Secret values are encrypted at rest and are never displayed again after saving.
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <label style={labelStyle}><strong>Chapter</strong><select value={chapterId} onChange={(event) => setChapterId(event.target.value)} style={fieldStyle}>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <label style={labelStyle}><strong>PayMongo Mode</strong><select value={mode} onChange={(event) => setMode(event.target.value as "TEST" | "LIVE")} style={fieldStyle}><option value="TEST">TEST — required first</option><option value="LIVE">LIVE — after approval</option></select></label>
          <label style={{ ...labelStyle, alignContent: "end" }}><span style={{ display: "flex", gap: 9, alignItems: "center", minHeight: 48 }}><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><strong>Enable Online Payment</strong></span></label>
        </div>
        {mode === "LIVE" && !liveGloballyEnabled ? <div style={warningStyle}>LIVE configuration can be stored, but it cannot be enabled until PSP test-mode E2E is signed off and platform live processing is explicitly approved.</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <label style={labelStyle}><strong>{hasSecretKey ? "Rotate Secret Key (optional)" : "PayMongo Secret Key"}</strong><input type="password" autoComplete="off" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} placeholder={hasSecretKey ? "Leave blank to keep current key" : mode === "LIVE" ? "sk_live_…" : "sk_test_…"} style={fieldStyle} /></label>
          <label style={labelStyle}><strong>{hasWebhookSecret ? "Rotate Webhook Secret (optional)" : "Webhook Signing Secret"}</strong><input type="password" autoComplete="off" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder={hasWebhookSecret ? "Leave blank to keep current secret" : "Webhook signing secret"} style={fieldStyle} /></label>
        </div>
        <div>
          <strong>Accepted Payment Methods</strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 9 }}>
            {methods.map((method) => <label key={method.code} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", border: "1px solid #ddd5c1", borderRadius: 999, background: selectedMethods.includes(method.code) ? "#fff7d7" : "#fff" }}><input type="checkbox" checked={selectedMethods.includes(method.code)} onChange={() => toggleMethod(method.code)} />{method.label}</label>)}
          </div>
        </div>
        {webhookUrl ? <div style={{ padding: 12, background: "#f7f4ec", borderRadius: 12, overflowWrap: "anywhere" }}><small style={{ color: "#746b5b" }}>Configure this exact PayMongo webhook endpoint for the chapter:</small><br/><strong>{webhookUrl}</strong></div> : null}
        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy || !selectedMethods.length} style={{ width: "100%" }}>{busy ? "Saving…" : "Save Chapter PayMongo"}</button>
      </form>
    </section>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 7 };
const fieldStyle: React.CSSProperties = { minHeight: 48, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px", background: "#fff", font: "inherit" };
const warningStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff6dd", border: "1px solid #ebd594", color: "#684d00" };
const successStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
