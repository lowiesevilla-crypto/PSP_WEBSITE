"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChangeTemporaryPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/change-temporary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to set your permanent password.");
      setSuccess(true);
      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to set your permanent password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" style={{ padding: 15, borderRadius: 12, background: "#eff9ea", color: "#355625" }}>
        Permanent password saved. Opening your PSP account…
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
      <p style={{ margin: 0, color: "#665f52", lineHeight: 1.55 }}>
        You signed in with a temporary password created by an authorized PSP administrator. Create your own permanent password before continuing to the portal.
      </p>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>New Permanent Password</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }}
        />
      </label>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Confirm Permanent Password</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }}
        />
      </label>
      <small style={{ color: "#746b5b", lineHeight: 1.5 }}>
        Use at least 10 characters. Your permanent password must be different from the temporary password.
      </small>
      {error ? <div role="alert" style={{ padding: 13, borderRadius: 12, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Saving…" : "Set Permanent Password"}
      </button>
    </form>
  );
}
