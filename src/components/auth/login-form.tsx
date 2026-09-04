"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/login/login.module.css";

type JsonPayload = { message?: string };
type AuthMethod = "password" | "passkey";

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
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;
    setPasskeySupported(supported);
    if (supported && window.localStorage.getItem("psp-passkey-enabled") === "1") {
      setAuthMethod("passkey");
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

  function selectMethod(method: AuthMethod) {
    setAuthMethod(method);
    setError(null);
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

  return (
    <div className={styles.authShell}>
      {passkeySupported ? (
        <div className={styles.methodTabs} role="tablist" aria-label="Choose sign-in method">
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === "password"}
            className={`${styles.methodTab} ${authMethod === "password" ? styles.methodTabActive : ""}`}
            disabled={submitting || passkeyBusy}
            onClick={() => selectMethod("password")}
          >
            <MailIcon />
            Email &amp; Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === "passkey"}
            className={`${styles.methodTab} ${authMethod === "passkey" ? styles.methodTabActive : ""}`}
            disabled={submitting || passkeyBusy}
            onClick={() => selectMethod("passkey")}
          >
            <FingerprintIcon />
            Use Passkey
          </button>
        </div>
      ) : null}

      {authMethod === "password" || !passkeySupported ? (
        <form onSubmit={submit} className={styles.form} aria-label="Sign in with email and password">
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldWrap}>
              <input
                className={styles.fieldInput}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
              <span className={styles.fieldIcon}>
                <MailIcon />
              </span>
            </span>
          </label>

          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Password</span>
            <span className={styles.fieldWrap}>
              <input
                className={styles.fieldInput}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                maxLength={128}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <EyeIcon crossed={showPassword} />
              </button>
            </span>
          </label>

          <div className={styles.formMeta}>
            <a href="/forgot-password" className={styles.textLink}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting || passkeyBusy}
            className={styles.primaryButton}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      ) : (
        <div className={styles.passkeyPanel} role="tabpanel" aria-label="Sign in with passkey">
          <div className={styles.passkeyBadge} aria-hidden="true">
            <FingerprintIcon size={34} />
          </div>
          <h2 className={styles.passkeyTitle}>Sign in with your passkey</h2>
          <p className={styles.passkeyCopy}>
            Use the passkey saved on this device for a fast, passwordless sign-in. Your device may ask for your fingerprint, face, or PIN.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={passkeyBusy || submitting}
            onClick={() => void signInWithPasskey()}
          >
            {passkeyBusy ? "Verifying Passkey…" : "Continue with Passkey"}
          </button>
          <button
            type="button"
            className={styles.linkButton}
            disabled={passkeyBusy || submitting}
            onClick={() => selectMethod("password")}
          >
            Use email &amp; password instead
          </button>
        </div>
      )}

      {error ? (
        <div role="alert" aria-live="polite" className={styles.alert}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function FingerprintIcon({ size }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={size ? { width: size, height: size } : undefined}
    >
      <path d="M12 11a2 2 0 0 1 2 2c0 4-1.2 6.7-2.5 8" />
      <path d="M8.2 20.2C9.3 18.7 10 16.5 10 13a2 2 0 1 1 4 0" />
      <path d="M5.7 18.3C6.5 16.8 7 15.1 7 13a5 5 0 0 1 10 0c0 2.8-.5 5.2-1.5 7.1" />
      <path d="M4.5 15.5A8 8 0 0 1 4 13a8 8 0 0 1 16 0c0 1.5-.1 2.9-.4 4.2" />
      <path d="M6 6.4A9.6 9.6 0 0 1 12 4c2.2 0 4.2.7 5.8 1.9" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}
