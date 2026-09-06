"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type MemberEditFormProps = {
  member: {
    id: string;
    membershipNo: string;
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    address: string | null;
    mobile: string | null;
    dateSurvive: string | null;
    surviveLocation: string | null;
    pspBirthdayCode: string | null;
    birthDate: string | null;
  };
};

export function MemberEditForm({ member }: MemberEditFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      middleInitial: String(form.get("middleInitial") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      mobile: String(form.get("mobile") ?? "").trim(),
      dateSurvive: String(form.get("dateSurvive") ?? "").trim(),
      surviveLocation: String(form.get("surviveLocation") ?? "").trim(),
      pspBirthdayCode: String(form.get("pspBirthdayCode") ?? "").trim(),
      birthDate: String(form.get("birthDate") ?? "").trim(),
    };

    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to update member information.");
      setMessage(result.message ?? "Member information updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update member information.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details style={{ border: "1px solid #e4ddcf", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "10px 12px", fontWeight: 850, minHeight: 44 }}>
        Edit Member Information
      </summary>
      <form onSubmit={submit} style={{ display: "grid", gap: 11, padding: "0 12px 12px" }}>
        <div style={{ padding: 10, borderRadius: 10, background: "#f7f4ec", color: "#665b47", fontSize: ".82rem", lineHeight: 1.45 }}>
          Membership No. <strong>{member.membershipNo}</strong> and login email are protected. Chapter changes use the audited Transfer Member workflow.
        </div>
        <div className="admin-form-grid">
          <Field label="First Name"><input name="firstName" required defaultValue={member.firstName} style={fieldStyle} /></Field>
          <Field label="Last Name"><input name="lastName" required defaultValue={member.lastName} style={fieldStyle} /></Field>
          <Field label="Middle Initial"><input name="middleInitial" defaultValue={member.middleInitial ?? ""} maxLength={5} style={fieldStyle} /></Field>
          <Field label="Mobile No."><input name="mobile" defaultValue={member.mobile ?? ""} maxLength={30} style={fieldStyle} /></Field>
          <Field label="Date Survive"><input name="dateSurvive" type="date" defaultValue={member.dateSurvive ?? ""} style={fieldStyle} /></Field>
          <Field label="Date of Birth"><input name="birthDate" type="date" defaultValue={member.birthDate ?? ""} style={fieldStyle} /></Field>
          <Field label="PSP Birthday Code"><input name="pspBirthdayCode" defaultValue={member.pspBirthdayCode ?? ""} maxLength={100} style={fieldStyle} /></Field>
          <Field label="Survive / Initiation Location"><input name="surviveLocation" defaultValue={member.surviveLocation ?? ""} maxLength={500} style={fieldStyle} /></Field>
        </div>
        <Field label="Address"><textarea name="address" defaultValue={member.address ?? ""} maxLength={500} rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></Field>
        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ minHeight: 44 }}>
          {busy ? "Saving…" : "Save Member Information"}
        </button>
      </form>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5 }}><span style={{ fontWeight: 800, fontSize: ".82rem" }}>{label}</span>{children}</label>;
}

const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 44, border: "1px solid #d8d1c4", borderRadius: 10, padding: "9px 10px", background: "#fff", font: "inherit" };
const successStyle: React.CSSProperties = { padding: 10, borderRadius: 10, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 10, borderRadius: 10, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
