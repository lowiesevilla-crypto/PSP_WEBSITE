"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ token }: { token: string }) {
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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to reset password.");
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <div role="status" style={{ padding: 15, borderRadius: 12, background: "#eff9ea" }}>Password updated. Redirecting to sign in…</div>;
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>New Password</span>
        <input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }} />
      </label>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Confirm New Password</span>
        <input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }} />
      </label>
      {error ? <div role="alert" style={{ padding: 13, borderRadius: 12, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Updating…" : "Reset Password"}
      </button>
    </form>
  );
}
