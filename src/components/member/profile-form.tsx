"use client";

import { FormEvent, useState } from "react";

export function ProfileForm({ mobile, address }: { mobile: string | null; address: string | null }) {
  const [form, setForm] = useState({ mobile: mobile ?? "", address: address ?? "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to save profile.");
      setMessage("Profile updated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 7 }}>
        <strong>Mobile No.</strong>
        <input
          type="tel"
          inputMode="tel"
          value={form.mobile}
          maxLength={30}
          onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "grid", gap: 7 }}>
        <strong>Address</strong>
        <textarea
          value={form.address}
          maxLength={500}
          rows={4}
          onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>
      {message ? <div role="status" style={successStyle}>{message}</div> : null}
      {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifySelf: "start" }}>
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  border: "1px solid #ddd5c1",
  borderRadius: 12,
  padding: "11px 13px",
  font: "inherit",
  background: "#fff",
};

const successStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#eef8ef",
  border: "1px solid #bcdcbc",
  color: "#245b2a",
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #e8b5b5",
  color: "#7b2424",
};
