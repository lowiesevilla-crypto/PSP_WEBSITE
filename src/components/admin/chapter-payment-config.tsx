"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Chapter = { id: string; name: string };
type Method = "gcash" | "paymaya" | "qrph";
type ConfigPayload = {
  config: null | {
    mode: "TEST" | "LIVE";
    linkedAccountId: string | null;
    paymentMethods: unknown;
    isEnabled: boolean;
    hasWebhookSecret: boolean;
  };
  webhookUrl?: string;
  platformReady?: boolean;
  platformMode?: "TEST" | "LIVE" | null;
  liveGloballyEnabled?: boolean;
  message?: string;
};

const methods: Array<{ code: Method; label: string }> = [
  { code: "qrph", label: "QR Ph" },
  { code: "gcash", label: "GCash" },
  { code: "paymaya", label: "Maya" },
];

export function ChapterPaymentConfig({ chapters }: { chapters: Chapter[] }) {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [mode, setMode] = useState<"TEST" | "LIVE">("TEST");
  const [selectedMethods, setSelectedMethods] = useState<Method[]>(["qrph"]);
  const [enabled, setEnabled] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [platformReady, setPlatformReady] = useState(false);
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
        setMode(payload.platformMode ?? (config?.mode === "LIVE" ? "LIVE" : "TEST"));
        setEnabled(Boolean(config?.isEnabled));
        setLinkedAccountId(config?.linkedAccountId ?? "");
        setPlatformReady(Boolean(payload.platformReady));
        const configuredMethods = Array.isArray(config?.paymentMethods)
          ? config.paymentMethods.filter((value): value is Method => methods.some((method) => method.code === value))
          : ["qrph" as Method];
        setSelectedMethods(configuredMethods.length ? configuredMethods : ["qrph"]);
        setWebhookUrl(payload.webhookUrl ?? "");
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
    if (!chapterId || selectedMethods.length === 0 || !linkedAccountId.startsWith("org_")) return;
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
          linkedAccountId: linkedAccountId.trim(),
          paymentMethods: selectedMethods,
          isEnabled: enabled,
        }),
      });
      const payload = (await response.json()) as ConfigPayload;
      if (!response.ok) throw new Error(payload.message ?? "Unable to save linked PayMongo account.");
      setWebhookUrl(payload.webhookUrl ?? webhookUrl);
      setPlatformReady(true);
      setMessage(`${currentChapter?.name ?? "Chapter"} linked PayMongo account saved. Child webhook signing is configured automatically.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save linked PayMongo account.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) return null;

  return (
    <section className="app-panel" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>PAYMONGO PLATFORMS</small>
          <h2 style={{ margin: "5px 0 6px" }}>Chapter Linked Payment Account</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6, margin: 0, maxWidth: 760 }}>
            PSP uses its platform PayMongo account as the parent. Each chapter is a linked child account. The disclosed PSP convenience fee is split to the platform automatically and the remaining amount is settled to the chapter.
          </p>
        </div>
        <span style={{ padding: "7px 10px", borderRadius: 999, background: platformReady ? "#eef8ef" : "#fff6dd", fontWeight: 900, fontSize: ".78rem" }}>
          {platformReady ? `PLATFORM ${mode}` : "PLATFORM CONFIG REQUIRED"}
        </span>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <label style={labelStyle}><strong>Chapter</strong><select value={chapterId} onChange={(event) => setChapterId(event.target.value)} style={fieldStyle}>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
        <label style={labelStyle}>
          <strong>PayMongo Linked Child Account ID</strong>
          <input autoComplete="off" value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)} placeholder="org_..." style={fieldStyle} />
          <small style={{ color: "#6b665c" }}>Enter the chapter&apos;s PayMongo linked Account ID. Do not enter or store a chapter API secret key.</small>
        </label>
        <label style={labelStyle}><strong>PayMongo Mode</strong><input value={mode} readOnly style={{ ...fieldStyle, background: "#f5f1e7" }} /><small style={{ color: "#6b665c" }}>Chapter mode must match the PSP platform PayMongo mode.</small></label>
        <div>
          <strong>Accepted Payment Methods</strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 9 }}>
            {methods.map((method) => <label key={method.code} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", border: "1px solid #ddd5c1", borderRadius: 999, background: selectedMethods.includes(method.code) ? "#fff7d7" : "#fff" }}><input type="checkbox" checked={selectedMethods.includes(method.code)} onChange={() => toggleMethod(method.code)} />{method.label}</label>)}
          </div>
        </div>
        {webhookUrl ? <div style={{ padding: 12, background: "#f7f4ec", borderRadius: 12, overflowWrap: "anywhere" }}><small style={{ color: "#746b5b" }}>Chapter webhook endpoint</small><br/><strong>{webhookUrl}</strong><small style={{ display: "block", marginTop: 5, color: "#6b665c" }}>PSP creates/maintains this webhook on the linked child account and stores only the encrypted signing secret.</small></div> : null}
        <label style={{ display: "flex", gap: 9, alignItems: "center", minHeight: 48 }}><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!platformReady || !linkedAccountId.startsWith("org_")} /><strong>Enable Online Payment</strong></label>
        {!platformReady ? <div style={warningStyle}>The PSP platform PayMongo parent account and convenience-fee configuration must be completed before a chapter can accept online payments.</div> : null}
        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy || !selectedMethods.length || !linkedAccountId.startsWith("org_")} style={{ width: "100%" }}>{busy ? "Saving…" : "Save Linked PayMongo Account"}</button>
      </form>
    </section>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 7 };
const fieldStyle: React.CSSProperties = { minHeight: 48, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px", background: "#fff", font: "inherit" };
const warningStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff6dd", border: "1px solid #ebd594", color: "#684d00" };
const successStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
