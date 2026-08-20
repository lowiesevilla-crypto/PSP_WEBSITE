"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ActivationForm({ token }: { token: string }) {
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
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to activate account.");
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to activate account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" style={{ padding: 16, borderRadius: 14, background: "#eff9ea", border: "1px solid #bfddb0" }}>
        Account activated. Redirecting you to sign in…
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
      <p style={{ margin: 0, color: "#746b5b", lineHeight: 1.6 }}>
        Create your secure password to activate your approved Psi Sigma Phi member account.
      </p>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>New Password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={10}
          maxLength={128}
          required
          style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }}
        />
      </label>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Confirm Password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={10}
          maxLength={128}
          required
          style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }}
        />
      </label>
      {error ? <div role="alert" style={{ padding: 13, borderRadius: 12, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Activating…" : "Activate Account"}
      </button>
    </form>
  );
}
