"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";

type PasskeySummary = {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export function PasskeySettings({ initialPasskeys }: { initialPasskeys: PasskeySummary[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/auth/passkeys", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { passkeys?: PasskeySummary[] };
    setPasskeys(payload.passkeys ?? []);
  }

  async function enablePasskey() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!("PublicKeyCredential" in window)) {
        throw new Error("Passkeys are not supported by this browser or device.");
      }
      const optionsResponse = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const optionsJSON = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(optionsJSON?.message ?? "Unable to start passkey setup.");
      }

      const registration = await startRegistration({ optionsJSON });
      const verifyResponse = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(registration),
      });
      const payload = (await verifyResponse.json()) as { message?: string; verified?: boolean };
      if (!verifyResponse.ok || !payload.verified) {
        throw new Error(payload.message ?? "Passkey verification failed.");
      }

      window.localStorage.setItem("psp-passkey-enabled", "1");
      await refresh();
      setMessage("Passkey enabled. On this device, PSP will now hide email/password fields by default and offer passkey sign-in first.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enable passkey.");
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to remove passkey.");
      await refresh();
      setMessage("Passkey removed.");
      if (passkeys.length <= 1) window.localStorage.removeItem("psp-passkey-enabled");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove passkey.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Passkey Login</h2>
        <p style={{ margin: 0, color: "#6b665c", lineHeight: 1.6 }}>
          Use Face ID, Touch ID, Android screen lock, Windows Hello, or another supported passkey instead of typing your PSP password.
        </p>
      </div>

      <button className="btn btn-primary" type="button" onClick={() => void enablePasskey()} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Working…" : passkeys.length ? "Add Another Passkey" : "Enable Passkey"}
      </button>

      {passkeys.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {passkeys.map((passkey) => (
            <div key={passkey.id} style={{ border: "1px solid #e5dece", borderRadius: 14, padding: 13, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <strong>{passkey.name || "Passkey"}</strong>
                <div style={{ color: "#756d5f", fontSize: ".8rem", marginTop: 3 }}>
                  {passkey.deviceType || "Authenticator"}{passkey.backedUp ? " · synced/backed up" : ""}
                </div>
              </div>
              <button type="button" disabled={busy} onClick={() => void removePasskey(passkey.id)} className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "#746b5b", fontSize: ".85rem" }}>No passkey is registered yet. Your password remains available as a recovery fallback.</p>
      )}

      {message ? <div role="status" style={{ padding: 12, borderRadius: 12, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" }}>{message}</div> : null}
      {error ? <div role="alert" style={{ padding: 12, borderRadius: 12, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" }}>{error}</div> : null}
    </div>
  );
}
