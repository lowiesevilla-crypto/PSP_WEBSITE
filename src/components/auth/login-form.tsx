"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to sign in.");
      }

      const contextResponse = await fetch("/api/auth/me", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const context = contextResponse.ok
        ? ((await contextResponse.json()) as {
            user?: { member?: unknown };
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

      router.replace(hasNationalAdminAccess && !context?.user?.member ? "/admin" : "/member");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{
            minHeight: 50,
            border: "1px solid #ded7c7",
            borderRadius: 12,
            padding: "11px 13px",
            fontSize: "1rem",
          }}
        />
      </label>

      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontWeight: 800 }}>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          maxLength={128}
          style={{
            minHeight: 50,
            border: "1px solid #ded7c7",
            borderRadius: 12,
            padding: "11px 13px",
            fontSize: "1rem",
          }}
        />
      </label>

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

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary"
        style={{ width: "100%", opacity: submitting ? 0.65 : 1 }}
      >
        {submitting ? "Signing in…" : "Sign In"}
      </button>

      <a href="/forgot-password" style={{ textAlign: "center", fontWeight: 700 }}>
        Forgot password?
      </a>
    </form>
  );
}
