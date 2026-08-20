"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      setMessage(
        payload.message ??
          "If an eligible account exists, password reset instructions will be sent.",
      );
    } catch {
      setMessage("Unable to submit the request right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Registered Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{ minHeight: 50, border: "1px solid #ded7c7", borderRadius: 12, padding: "11px 13px" }}
        />
      </label>
      {message ? <div role="status" style={{ padding: 14, borderRadius: 12, background: "#fff9df" }}>{message}</div> : null}
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Submitting…" : "Send Reset Instructions"}
      </button>
      <a href="/login" style={{ textAlign: "center", fontWeight: 700 }}>Back to Sign In</a>
    </form>
  );
}
