"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Chapter = { id: string; name: string };
type Method = "gcash" | "paymaya" | "qrph";
type ConfigurationState = "NOT_CONFIGURED" | "DRAFT" | "READY" | "ENABLED" | "BLOCKED";
type PlatformConfiguration = {
  parentAccountConfigured: boolean;
  parentSecretConfigured: boolean;
  feeConfigured: boolean;
  encryptionReady: boolean;
  detectedMode: "TEST" | "LIVE" | null;
  liveEnabled: boolean;
};
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
  paymentEncryptionReady?: boolean;
  platformConfiguration?: PlatformConfiguration;
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

const emptyPlatformConfiguration: PlatformConfiguration = {
  parentAccountConfigured: false,
  parentSecretConfigured: false,
  feeConfigured: false,
  encryptionReady: false,
  detectedMode: null,
  liveEnabled: false,
};

function configuredMethods(value: unknown): Method[] {
  if (!Array.isArray(value)) return ["qrph"];
  const selected = value.filter((item): item is Method => methods.some((method) => method.code === item));
  return selected.length ? selected : ["qrph"];
}

function sameMethods(left: Method[], right: Method[]) {
  return left.length === right.length && left.every((method) => right.includes(method));
}

export function ChapterPaymentConfig({ chapters }: { chapters: Chapter[] }) {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [mode, setMode] = useState<"TEST" | "LIVE">("TEST");
  const [selectedMethods, setSelectedMethods] = useState<Method[]>(["qrph"]);
  const [enabled, setEnabled] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [savedLinkedAccountId, setSavedLinkedAccountId] = useState("");
  const [savedMode, setSavedMode] = useState<"TEST" | "LIVE" | null>(null);
  const [savedMethods, setSavedMethods] = useState<Method[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);
  const [platformMode, setPlatformMode] = useState<"TEST" | "LIVE" | null>(null);
  const [platformMessage, setPlatformMessage] = useState<string | null>(null);
  const [paymentEncryptionReady, setPaymentEncryptionReady] = useState(false);
  const [platformConfiguration, setPlatformConfiguration] = useState<PlatformConfiguration>(emptyPlatformConfiguration);
  const [configurationState, setConfigurationState] = useState<ConfigurationState>("NOT_CONFIGURED");
  const [activationBlockers, setActivationBlockers] = useState<string[]>([]);
  const [busy, setBusy] = useState(Boolean(chapters[0]?.id));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentChapter = useMemo(() => chapters.find((chapter) => chapter.id === chapterId), [chapters, chapterId]);

  useEffect(() => {
    if (!chapterId) return;
    const controller = new AbortController();
    let cancelled = false;

    void fetch(`/api/admin/finance/payment-config?chapterId=${encodeURIComponent(chapterId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as ConfigPayload;
        if (!response.ok) throw new Error(payload.message ?? "Unable to load payment configuration.");
        if (cancelled) return;
        const config = payload.config;
        const loadedMode = config?.mode ?? payload.platformMode ?? "TEST";
        const loadedLinkedAccountId = config?.linkedAccountId ?? "";
        const loadedMethods = configuredMethods(config?.paymentMethods);
        setMode(loadedMode);
        setSavedMode(config ? loadedMode : null);
        setEnabled(Boolean(config?.isEnabled));
        setLinkedAccountId(loadedLinkedAccountId);
        setSavedLinkedAccountId(loadedLinkedAccountId);
        setSelectedMethods(loadedMethods);
        setSavedMethods(config ? loadedMethods : []);
        setHasWebhookSecret(Boolean(config?.hasWebhookSecret));
        setPlatformReady(Boolean(payload.platformReady));
        setPlatformMode(payload.platformMode ?? null);
        setPlatformMessage(payload.platformMessage ?? null);
        setPaymentEncryptionReady(Boolean(payload.paymentEncryptionReady));
        setPlatformConfiguration(payload.platformConfiguration ?? emptyPlatformConfiguration);
        setConfigurationState(payload.configurationState ?? (config ? "DRAFT" : "NOT_CONFIGURED"));
        setActivationBlockers(Array.isArray(payload.activationBlockers) ? payload.activationBlockers : []);
        setWebhookUrl(payload.webhookUrl ?? "");
      })
      .catch((cause) => {
        if (!cancelled && (cause as Error).name !== "AbortError") {
          setError(cause instanceof Error ? cause.message : "Unable to load payment configuration.");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [chapterId]);

  function changeChapter(nextChapterId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setSavedLinkedAccountId("");
    setSavedMode(null);
    setSavedMethods([]);
    setChapterId(nextChapterId);
  }

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
      setPlatformMode(payload.platformMode ?? null);
      setPlatformMessage(payload.platformMessage ?? null);
      setPaymentEncryptionReady(Boolean(payload.paymentEncryptionReady));
      setPlatformConfiguration(payload.platformConfiguration ?? platformConfiguration);
      setHasWebhookSecret(Boolean(payload.config?.hasWebhookSecret));
      setEnabled(Boolean(payload.config?.isEnabled));
      setConfigurationState(payload.configurationState ?? (payload.config?.isEnabled ? "ENABLED" : "DRAFT"));
      setActivationBlockers(Array.isArray(payload.activationBlockers) ? payload.activationBlockers : []);
      if (payload.config) {
        const persistedMethods = configuredMethods(payload.config.paymentMethods);
        setLinkedAccountId(payload.config.linkedAccountId ?? linkedAccountId.trim());
        setSavedLinkedAccountId(payload.config.linkedAccountId ?? linkedAccountId.trim());
        setMode(payload.config.mode);
        setSavedMode(payload.config.mode);
        setSelectedMethods(persistedMethods);
        setSavedMethods(persistedMethods);
      }
      setMessage(
        payload.config?.isEnabled
          ? `${currentChapter?.name ?? "Chapter"} online payment is enabled. Child webhook signing is configured.`
          : `${currentChapter?.name ?? "Chapter"} linked Account ID, mode and payment methods were saved as a disabled draft.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save linked PayMongo account.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) return null;

  const currentLinkedAccountId = linkedAccountId.trim();
  const linkedIdSaved = Boolean(savedLinkedAccountId) && savedLinkedAccountId === currentLinkedAccountId;
  const draftMatchesSaved = linkedIdSaved && savedMode === mode && sameMethods(savedMethods, selectedMethods);
  const modeMatchesPlatform = !platformMode || mode === platformMode;
  const canRequestEnable = platformReady && paymentEncryptionReady && modeMatchesPlatform && draftMatchesSaved;
  const chapterAccountStatus = linkedIdSaved
    ? "Linked ID saved"
    : currentLinkedAccountId.startsWith("org_")
      ? "Valid ID · unsaved changes"
      : savedLinkedAccountId
        ? "Saved ID has unsaved changes"
        : "Not configured";

  return (
    <section className="app-panel" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>PAYMONGO PLATFORMS</small>
          <h2 style={{ margin: "5px 0 6px" }}>Split Payment & Chapter Linked Account</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6, margin: 0, maxWidth: 820 }}>
            The PSP parent platform controls split settlement and the convenience fee. Each Chapter then saves its own linked child Account ID, TEST/LIVE draft mode and accepted methods. Saving a disabled Chapter draft does not activate online payment.
          </p>
        </div>
        <span style={{ ...stateBadgeStyle, ...stateBadgeTone(configurationState) }}>
          {stateLabel(configurationState)}
        </span>
      </div>

      <div style={platformPanelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <small style={{ color: "#806500", fontWeight: 900 }}>PSP PARENT SPLIT-PAYMENT PLATFORM</small>
            <h3 style={{ margin: "4px 0 5px" }}>National / System Payment Setup</h3>
            <p style={{ margin: 0, color: "#6b665c", lineHeight: 1.5, maxWidth: 760 }}>
              Parent PayMongo credentials and the PSP split/convenience fee are server-level settings. They are intentionally separate from a Chapter&apos;s linked account and no parent secret key is shown in this page.
            </p>
          </div>
          <span style={{ ...stateBadgeStyle, ...(platformReady ? { background: "#eaf7ec", color: "#245b2a", borderColor: "#bcdcbc" } : { background: "#fff6dd", color: "#684d00", borderColor: "#ebd594" }) }}>
            {platformReady ? `PLATFORM READY · ${platformMode ?? mode}` : "PLATFORM SETUP REQUIRED"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9, marginTop: 12 }}>
          <ReadinessItem label="Parent Account" value={platformConfiguration.parentAccountConfigured ? "Configured" : "Required"} ready={platformConfiguration.parentAccountConfigured} />
          <ReadinessItem label="Platform Secret" value={platformConfiguration.parentSecretConfigured ? `Configured · ${platformConfiguration.detectedMode ?? "Mode detected"}` : "Required"} ready={platformConfiguration.parentSecretConfigured} />
          <ReadinessItem label="Split / Convenience Fee" value={platformConfiguration.feeConfigured ? "Configured" : "Required"} ready={platformConfiguration.feeConfigured} />
          <ReadinessItem label="Credential Encryption" value={paymentEncryptionReady ? "Ready" : "Required for activation"} ready={paymentEncryptionReady} />
        </div>
        <details style={{ marginTop: 12, borderTop: "1px solid #e5dece", paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Where do I configure PSP split payments?</summary>
          <div style={{ marginTop: 9, color: "#625b4e", lineHeight: 1.55 }}>
            Configure the PSP parent platform in the production server&apos;s secure environment settings. Required settings are <code>PAYMONGO_PLATFORM_ACCOUNT_ID</code>, <code>PAYMONGO_PLATFORM_SECRET_KEY</code>, <code>PLATFORM_CONVENIENCE_FEE_BPS</code> and/or <code>PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS</code>, plus <code>PAYMENT_CONFIG_ENCRYPTION_KEY</code>. Keep <code>PAYMONGO_LIVE_ENABLED</code> disabled until controlled TEST acceptance is complete.
          </div>
        </details>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 16 }}>
        <ReadinessItem label="PSP Platform" value={platformReady ? `Ready · ${platformMode ?? mode}` : "Configuration required"} ready={platformReady} />
        <ReadinessItem label="Chapter Account" value={chapterAccountStatus} ready={linkedIdSaved} />
        <ReadinessItem label="Child Webhook" value={hasWebhookSecret ? "Signing ready" : "Created on activation"} ready={hasWebhookSecret || !enabled} />
        <ReadinessItem label="Online Payment" value={enabled ? "Enabled" : "Disabled"} ready={enabled} />
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <label style={labelStyle}><strong>Chapter</strong><select value={chapterId} onChange={(event) => changeChapter(event.target.value)} disabled={busy} style={fieldStyle}>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
        <label style={labelStyle}>
          <strong>PayMongo Linked Child Account ID</strong>
          <input autoComplete="off" value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)} placeholder="org_..." disabled={busy || enabled} style={fieldStyle} />
          <small style={{ color: "#6b665c" }}>Enter the Chapter&apos;s PayMongo linked Account ID (org_*). This is an account identifier, not a Chapter API secret key. It can be saved safely while Online Payment is disabled.</small>
        </label>
        <label style={labelStyle}>
          <strong>PayMongo Mode</strong>
          <select value={mode} onChange={(event) => setMode(event.target.value as "TEST" | "LIVE")} disabled={busy || enabled} style={fieldStyle}>
            <option value="TEST">TEST</option>
            <option value="LIVE">LIVE</option>
          </select>
          <small style={{ color: "#6b665c" }}>
            Editable while this Chapter is disabled. Activation requires the Chapter mode to match the PSP parent platform{platformMode ? ` (${platformMode})` : ""}. LIVE also remains blocked until the global LIVE gate is explicitly approved.
          </small>
        </label>
        <div>
          <strong>Accepted Payment Methods</strong>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 9 }}>
            {methods.map((method) => <label key={method.code} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 44, padding: "8px 11px", border: "1px solid #ddd5c1", borderRadius: 999, background: selectedMethods.includes(method.code) ? "#fff7d7" : "#fff" }}><input type="checkbox" checked={selectedMethods.includes(method.code)} onChange={() => toggleMethod(method.code)} disabled={busy || enabled} />{method.label}</label>)}
          </div>
        </div>
        {webhookUrl ? <div style={{ padding: 12, background: "#f7f4ec", borderRadius: 12, overflowWrap: "anywhere" }}><small style={{ color: "#746b5b" }}>Chapter webhook endpoint</small><br/><strong>{webhookUrl}</strong><small style={{ display: "block", marginTop: 5, color: "#6b665c" }}>{hasWebhookSecret ? "Webhook signing is configured and stored encrypted." : "This endpoint will be registered on the linked child account only when Online Payment is activated."}</small></div> : null}
        {!enabled && currentLinkedAccountId.startsWith("org_") && !draftMatchesSaved ? <div style={infoStyle}><strong>Unsaved Chapter payment changes</strong><div style={{ marginTop: 4 }}>Save the disabled Chapter draft first. The Enable Online Payment switch will unlock only after this exact Account ID, mode and payment-method selection are persisted.</div></div> : null}
        <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 48, padding: "9px 11px", border: "1px solid #ddd5c1", borderRadius: 12, background: enabled ? "#fff8df" : "#fff" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={busy || (!enabled && !canRequestEnable)}
            style={{ width: 24, height: 24, flex: "0 0 24px" }}
          />
          <span><strong>Enable Online Payment</strong><small style={{ display: "block", color: "#6b665c", marginTop: 2 }}>Activation is fail-closed. Save the Chapter as a disabled draft first; this switch unlocks only when the saved draft, parent platform, credential encryption and matching mode are ready.</small></span>
        </label>

        {!platformReady ? <div style={warningStyle}><strong>Platform activation requirement</strong><div style={{ marginTop: 4 }}>{platformMessage ?? "Complete the PSP parent PayMongo account and convenience-fee configuration."}</div></div> : null}
        {activationBlockers.length ? <div style={warningStyle}><strong>Before enabling online payment</strong><ul style={{ margin: "7px 0 0", paddingLeft: 20 }}>{activationBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy || !selectedMethods.length || !currentLinkedAccountId.startsWith("org_")} style={{ width: "100%", minHeight: 48 }}>{busy ? "Saving…" : enabled ? "Save & Activate Online Payment" : "Save Disabled Chapter Draft"}</button>
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
const platformPanelStyle: React.CSSProperties = { marginTop: 16, padding: 14, border: "1px solid #ddd5c1", borderRadius: 14, background: "#fbfaf6" };
const stateBadgeStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900, fontSize: ".76rem" };
const warningStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff6dd", border: "1px solid #ebd594", color: "#684d00", lineHeight: 1.45 };
const infoStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#eef6ff", border: "1px solid #bdd6ee", color: "#174d78", lineHeight: 1.45 };
const successStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
