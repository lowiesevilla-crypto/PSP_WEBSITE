"use client";

import { FormEvent, useState } from "react";

type ProfileValues = {
  firstName: string;
  lastName: string;
  middleInitial: string;
  mobile: string;
  address: string;
  dateSurvive: string;
  surviveLocation: string;
  birthDate: string;
};

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [form, setForm] = useState(initial);
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
      setMessage("Personal record updated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof ProfileValues, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <Field label="First Name"><input value={form.firstName} required maxLength={100} onChange={(event) => set("firstName", event.target.value)} style={fieldStyle} /></Field>
        <Field label="Middle Initial"><input value={form.middleInitial} maxLength={5} onChange={(event) => set("middleInitial", event.target.value)} style={fieldStyle} /></Field>
        <Field label="Last Name"><input value={form.lastName} required maxLength={100} onChange={(event) => set("lastName", event.target.value)} style={fieldStyle} /></Field>
      </div>

      <Field label="Mobile No.">
        <input type="tel" inputMode="tel" value={form.mobile} maxLength={30} onChange={(event) => set("mobile", event.target.value)} style={fieldStyle} />
      </Field>
      <Field label="Address">
        <textarea value={form.address} maxLength={500} rows={4} onChange={(event) => set("address", event.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <Field label="Date Survive"><input type="date" value={form.dateSurvive} onChange={(event) => set("dateSurvive", event.target.value)} style={fieldStyle} /></Field>
        <Field label="Date of Birth"><input type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} style={fieldStyle} /></Field>
      </div>
      <Field label="Survive / Initiation Location">
        <input value={form.surviveLocation} maxLength={500} onChange={(event) => set("surviveLocation", event.target.value)} style={fieldStyle} />
      </Field>

      <p style={{ margin: 0, color: "#746b5b", fontSize: ".82rem", lineHeight: 1.55 }}>
        Your chapter, membership number, PSP Birthday Code, and login email are protected records. Chapter/code changes require an authorized administrator or account-security workflow.
      </p>

      {message ? <div role="status" style={successStyle}>{message}</div> : null}
      {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
        {saving ? "Saving…" : "Save Personal Record"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 7 }}><strong>{label}</strong>{children}</label>;
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
