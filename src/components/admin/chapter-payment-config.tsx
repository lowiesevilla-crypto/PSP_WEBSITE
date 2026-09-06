"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Chapter = { id: string; name: string };
type Method = "gcash" | "paymaya" | "qrph";
type ConfigurationState = "NOT_CONFIGURED" | "DRAFT" | "READY" | "ENABLED" | "BLOCKED";
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
  platformMessage?: string | null;
  liveGloballyEnabled?: boolean;
  configurationState?: ConfigurationState;
  activationReady?: boolean;
  activationBlockers?: string[];
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
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);
  const [platformMessage, setPlatformMessage] = useState<string | null>(null);
  const [configurationState, setConfigurationState] = useState<ConfigurationState>("NOT_CONFIGURED");
  const [activationBlockers, setActivationBlockers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentChapter = useMemo(() => chapters.find((chapter) => chapter.id === chapterId), [chapters, chapterId]);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    setMessage(null);
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
        setHasWebhookSecret(Boolean(config?.hasWebhookSecret));
        setPlatformReady(Boolean(payload.platformReady));
        setPlatformMessage(payload.platformMessage ?? null);
        setConfigurationState(payload.configurationState ?? (config ? "DRAFT" : "NOT_CONFIGURED"));
        setActivationBlockers(Array.isArray(payload.activationBlockers) ? payload.activationBlockers : []);
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
    if (!chapterId || selectedMethods.length === 0 || !linkedAccountId.trim().startsWith("org_")) return;
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
      setPlatformReady(Boolean(payload.platformReady));
      setPlatformMessage(payload.platformMessage ?? null);
      setHasWebhookSecret(Boolean(payload.config?.hasWebhookSecret));
      setEnabled(Boolean(payload.config?.isEnabled));
      setConfigurationState(payload.configurationState ?? (payload.config?.isEnabled ? "ENABLED" : "DRAFT"));
      setActivationBlockers(Array.isArray(payload.activationBlockers) ? payload.activationBlockers : []);
      setMessage(
        payload.config?.isEnabled
          ? `${currentChapter?.name ?? "Chapter"} online payment is enabled. Child webhook signing is configured.`
          : `${currentChapter?.name ?? "Chapter"} payment setup was saved safely. Online payment remains disabled until activation requirements are satisfied.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save linked PayMongo account.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) return null;

  const canRequestEnable = platformReady && linkedAccountId.trim().startsWith("org_");

  return (
    <section className="app-panel" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>PAYMONGO PLATFORMS</small>
          <h2 style={{ margin: "5px 0 6px" }}>Chapter Linked Payment Account</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6, margin: 0, maxWidth: 760 }}>
            Save each Chapter&apos;s linked child account first, then enable online payment only after the PSP parent platform, convenience fee, matching mode and child webhook are ready. Draft setup never makes a Chapter payable.
          </p>
        </div>
        <span style={{ ...stateBadgeStyle, ...stateBadgeTone(configurationState) }}>
          {stateLabel(configurationState)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 16 }}>
        <ReadinessItem label="PSP Platform" value={platformReady ? `Ready · ${mode}` : "Configuration required"} ready={platformReady} />
        <ReadinessItem label="Chapter Account" value={linkedAccountId.startsWith("org_") ? "Linked ID saved" : "Not configured"} ready={linkedAccountId.startsWith("org_")} />
        <ReadinessItem label="Child Webhook" value={hasWebhookSecret ? "Signing ready" : "Created on activation"} ready={hasWebhookSecret || !enabled} />
        <ReadinessItem label="Online Payment" value={enabled ? "Enabled" : "Disabled"} ready={enabled} />
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <label style={labelStyle}><strong>Chapter</strong><select value={chapterId} onChange={(event) => setChapterId(event.target.value)} style={fieldStyle}>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
        <label style={labelStyle}>
          <strong>PayMongo Linked Child Account ID</strong>
          <input autoComplete="off" value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)} placeholder="org_..." style={fieldStyle} />
          <small style={{ color: "#6b665c" }}>Enter the Chapter&apos;s PayMongo linked Account ID. Do not enter or store a Chapter API secret key.</small>
        </label>
        <label style={labelStyle}><strong>PayMongo Mode</strong><input value={mode} readOnly style={{ ...fieldStyle, background: "#f5f1e7" }} /><small style={{ color: "#6b665c" }}>When the PSP parent platform is configured, the Chapter mode follows that platform mode. Drafts remain disabled until they match.</small></label>
        <div>
          <strong>Accepted Payment Methods</strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 9 }}>
            {methods.map((method) => <label key={method.code} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 44, padding: "8px 11px", border: "1px solid #ddd5c1", borderRadius: 999, background: selectedMethods.includes(method.code) ? "#fff7d7" : "#fff" }}><input type="checkbox" checked={selectedMethods.includes(method.code)} onChange={() => toggleMethod(method.code)} />{method.label}</label>)}
          </div>
        </div>
        {webhookUrl ? <div style={{ padding: 12, background: "#f7f4ec", borderRadius: 12, overflowWrap: "anywhere" }}><small style={{ color: "#746b5b" }}>Chapter webhook endpoint</small><br/><strong>{webhookUrl}</strong><small style={{ display: "block", marginTop: 5, color: "#6b665c" }}>{hasWebhookSecret ? "Webhook signing is configured and stored encrypted." : "This endpoint will be registered on the linked child account when Online Payment is activated."}</small></div> : null}
        <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 48, padding: "9px 11px", border: "1px solid #ddd5c1", borderRadius: 12, background: enabled ? "#fff8df" : "#fff" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={busy || (!enabled && !canRequestEnable)}
            style={{ width: 24, height: 24, flex: "0 0 24px" }}
          />
          <span><strong>Enable Online Payment</strong><small style={{ display: "block", color: "#6b665c", marginTop: 2 }}>Activation is fail-closed. You can always save a disabled draft even while the PSP platform is not ready.</small></span>
        </label>

        {!platformReady ? <div style={warningStyle}><strong>Platform activation requirement</strong><div style={{ marginTop: 4 }}>{platformMessage ?? "Complete the PSP parent PayMongo account and convenience-fee configuration."}</div></div> : null}
        {activationBlockers.length ? <div style={warningStyle}><strong>Before enabling online payment</strong><ul style={{ margin: "7px 0 0", paddingLeft: 20 }}>{activationBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy || !selectedMethods.length || !linkedAccountId.trim().startsWith("org_")} style={{ width: "100%", minHeight: 48 }}>{busy ? "Saving…" : enabled ? "Save & Activate Online Payment" : "Save Chapter Payment Setup"}</button>
      </form>
    </section>
  );
}

function ReadinessItem({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div style={{ padding: 11, borderRadius: 12, border: "1px solid #e4ddcf", background: ready ? "#f3faf3" : "#faf8f2" }}>
      <small style={{ display: "block", color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 3, fontSize: ".9rem" }}>{value}</strong>
    </div>
  );
}

function stateLabel(state: ConfigurationState) {
  switch (state) {
    case "NOT_CONFIGURED": return "NOT CONFIGURED";
    case "DRAFT": return "DRAFT · DISABLED";
    case "READY": return "READY TO ACTIVATE";
    case "ENABLED": return "ONLINE PAYMENT ENABLED";
    case "BLOCKED": return "ENABLED · ACTION REQUIRED";
  }
}

function stateBadgeTone(state: ConfigurationState): React.CSSProperties {
  if (state === "ENABLED") return { background: "#eaf7ec", color: "#245b2a", borderColor: "#bcdcbc" };
  if (state === "READY") return { background: "#edf6ff", color: "#174d78", borderColor: "#bed8ed" };
  if (state === "BLOCKED") return { background: "#fff0f0", color: "#7b2424", borderColor: "#e8b5b5" };
  return { background: "#fff6dd", color: "#684d00", borderColor: "#ebd594" };
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 7 };
const fieldStyle: React.CSSProperties = { minHeight: 48, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px", background: "#fff", font: "inherit" };
const stateBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, fontSize: ".76rem" };
const warningStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff6dd", border: "1px solid #ebd594", color: "#684d00", lineHeight: 1.45 };
const successStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
