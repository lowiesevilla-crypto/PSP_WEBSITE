"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type JsonPayload = { message?: string };

async function readJsonPayload(response: Response): Promise<JsonPayload | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as JsonPayload;
  } catch {
    return null;
  }
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;
    setPasskeySupported(supported);
    if (supported && window.localStorage.getItem("psp-passkey-enabled") === "1") {
      setPasswordVisible(false);
    }
  }, []);

  async function routeAfterLogin() {
    const contextResponse = await fetch("/api/auth/me", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const context = contextResponse.ok
      ? ((await contextResponse.json()) as {
          assignments?: Array<{ chapterId: string | null; permissions: string[] }>;
        })
      : null;

    const hasNationalAdminAccess = Boolean(
      context?.assignments?.some(
        (assignment) =>
          assignment.chapterId === null &&
          assignment.permissions.some((permission) =>
            ["chapters.manage", "applications.review", "members.manage"].includes(permission),
          ),
      ),
    );

    router.replace(hasNationalAdminAccess ? "/admin" : "/member");
    router.refresh();
  }

  async function signInWithPasskey() {
    setPasskeyBusy(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/authenticate/options", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const optionsJSON = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(optionsJSON?.message ?? "Unable to start passkey sign-in.");
      }

      const authentication = await startAuthentication({ optionsJSON });
      const verifyResponse = await fetch("/api/auth/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(authentication),
      });
      const payload = await readJsonPayload(verifyResponse);
      if (!verifyResponse.ok) {
        throw new Error(payload?.message ?? "Passkey sign-in failed.");
      }

      window.localStorage.setItem("psp-passkey-enabled", "1");
      await routeAfterLogin();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Passkey sign-in failed.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = await readJsonPayload(response);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to sign in. Please try again.");
      }

      await routeAfterLogin();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    minHeight: 50,
    border: "1px solid #ded7c7",
    borderRadius: 12,
    padding: "11px 13px",
    fontSize: "1rem",
    color: "#151515",
    background: "#ffffff",
    caretColor: "#151515",
    outlineColor: "#fec009",
  } as const;

  return (
    <div style={{ display: "grid", gap: 16, color: "#151515" }}>
      {passkeySupported ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={passkeyBusy || submitting}
          onClick={() => void signInWithPasskey()}
          style={{ width: "100%", minHeight: 52, fontWeight: 900 }}
        >
          {passkeyBusy ? "Verifying Passkey…" : "Sign in with Passkey"}
        </button>
      ) : null}

      {passkeySupported && !passwordVisible ? (
        <>
          <p style={{ margin: 0, textAlign: "center", color: "#6b665c", fontSize: ".86rem", lineHeight: 1.5 }}>
            Passkey is enabled on this device, so your email and password fields are hidden by default.
          </p>
          <button
            type="button"
            onClick={() => setPasswordVisible(true)}
            style={{ border: 0, background: "transparent", color: "#7a5c00", fontWeight: 800, cursor: "pointer" }}
          >
            Use email & password instead
          </button>
        </>
      ) : null}

      {passwordVisible ? (
        <form onSubmit={submit} style={{ display: "grid", gap: 16, color: "#151515" }}>
          {passkeySupported ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8a8375", fontSize: ".78rem" }}>
              <span style={{ height: 1, background: "#e1dacb", flex: 1 }} />
              OR USE PASSWORD
              <span style={{ height: 1, background: "#e1dacb", flex: 1 }} />
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 7, color: "#151515" }}>
            <span style={{ fontWeight: 800, color: "#151515" }}>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              style={fieldStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 7, color: "#151515" }}>
            <span style={{ fontWeight: 800, color: "#151515" }}>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              maxLength={128}
              style={fieldStyle}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || passkeyBusy}
            className="btn btn-primary"
            style={{ width: "100%", opacity: submitting ? 0.65 : 1 }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <a
            href="/forgot-password"
            style={{ textAlign: "center", fontWeight: 800, color: "#7a5c00" }}
          >
            Forgot password?
          </a>
        </form>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            border: "1px solid #e8b5b5",
            background: "#fff1f1",
            color: "#7b2424",
            borderRadius: 12,
            padding: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
