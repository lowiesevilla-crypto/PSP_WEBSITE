"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Chapter = { id: string; name: string; code: string };
type Member = { id: string; chapterId: string; membershipNo: string; firstName: string; lastName: string };
type CertificateType = "MEMBERSHIP" | "ATTENDANCE" | "APPRECIATION" | "RECOGNITION" | "OUTSTANDING_MEMBER" | "CUSTOM";

const titles: Record<CertificateType, string> = {
  MEMBERSHIP: "Certificate of Membership",
  ATTENDANCE: "Certificate of Attendance",
  APPRECIATION: "Certificate of Appreciation",
  RECOGNITION: "Certificate of Recognition",
  OUTSTANDING_MEMBER: "Outstanding Member Certificate",
  CUSTOM: "",
};

export function CustomCertificateIssuer({ chapters, members }: { chapters: Chapter[]; members: Member[] }) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [certificateType, setCertificateType] = useState<CertificateType>("ATTENDANCE");
  const [title, setTitle] = useState(titles.ATTENDANCE);
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState(() => `cert-batch-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chapterMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((member) => member.chapterId === chapterId).filter((member) => {
      if (!q) return true;
      return `${member.membershipNo} ${member.firstName} ${member.lastName}`.toLowerCase().includes(q);
    });
  }, [members, chapterId, search]);

  function changeChapter(value: string) {
    setChapterId(value);
    setSelected([]);
    setSearch("");
    setMessage(null);
    setError(null);
  }

  function changeType(value: CertificateType) {
    setCertificateType(value);
    setTitle(titles[value]);
  }

  function toggleMember(memberId: string) {
    setSelected((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || (!selectAll && selected.length === 0)) {
      setError("Select at least one recipient or choose all active members in the Chapter.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      chapterId,
      selectAll,
      memberIds: selectAll ? undefined : selected,
      certificateType,
      title: String(form.get("title") ?? "").trim(),
      certificateDate: String(form.get("certificateDate") ?? "").trim(),
      citationText: String(form.get("citationText") ?? "").trim(),
      referenceLabel: String(form.get("referenceLabel") ?? "").trim(),
      batchId,
    };

    try {
      const response = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        message?: string;
        createdCount?: number;
        skippedCount?: number;
        requestedCount?: number;
        emailSentCount?: number;
        emailFailedCount?: number;
      };
      if (!response.ok) throw new Error(result.message ?? "Unable to issue certificates.");
      const sent = result.emailSentCount ?? 0;
      const failed = result.emailFailedCount ?? 0;
      const emailSummary = failed > 0
        ? ` Email delivery: ${sent} sent, ${failed} failed. Failed deliveries are recorded in Audit.`
        : ` Email delivery: ${sent} sent.`;
      setMessage(`Certificate batch processed: ${result.createdCount ?? 0} issued, ${result.skippedCount ?? 0} skipped out of ${result.requestedCount ?? 0} selected.${emailSummary}`);
      setSelected([]);
      setBatchId(`cert-batch-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to issue certificates.");
    } finally {
      setBusy(false);
    }
  }

  if (!chapters.length) return null;

  return (
    <section className="app-panel" style={{ marginBottom: 18 }} data-custom-certificate-tool-version="bulk-v2-email">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>CHAPTER CERTIFICATE TOOL</small>
          <h2 style={{ margin: "5px 0 6px" }}>Create & Assign Certificates</h2>
          <p style={{ margin: 0, maxWidth: 760, color: "#6b665c", lineHeight: 1.55 }}>
            Create Attendance, Appreciation, Recognition, Outstanding Member or custom certificates, then assign them to one, multiple or all active members in an authorized Chapter. Every newly issued certificate is emailed to the member with the Chapter Chairman&apos;s letter, the Chapter-logo PDF attachment and a QR verification link.
          </p>
        </div>
        <span style={{ padding: "7px 10px", borderRadius: 999, background: "#fff6dd", border: "1px solid #ebd594", color: "#684d00", fontWeight: 900, fontSize: ".76rem" }}>QR VERIFIED</span>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 13, marginTop: 18 }}>
        <div className="admin-form-grid">
          <Field label="Chapter">
            <select value={chapterId} onChange={(event) => changeChapter(event.target.value)} style={fieldStyle}>
              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}
            </select>
          </Field>
          <Field label="Certificate Type">
            <select value={certificateType} onChange={(event) => changeType(event.target.value as CertificateType)} style={fieldStyle}>
              <option value="ATTENDANCE">Attendance</option>
              <option value="APPRECIATION">Appreciation</option>
              <option value="RECOGNITION">Recognition</option>
              <option value="OUTSTANDING_MEMBER">Outstanding Member</option>
              <option value="MEMBERSHIP">Membership</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </Field>
          <Field label="Certificate Title">
            <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} style={fieldStyle} placeholder="Certificate of Appreciation" />
          </Field>
          <Field label="Certificate Date">
            <input name="certificateDate" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={fieldStyle} />
          </Field>
        </div>

        <Field label="Citation / Appreciation Letter Text">
          <textarea name="citationText" rows={4} maxLength={1500} style={{ ...fieldStyle, resize: "vertical" }} placeholder="Example: In grateful appreciation of exemplary service, dedication and contribution to the Chapter and Psi Sigma Phi Philippines Inc." />
        </Field>
        <Field label="Event / Reference (optional)">
          <input name="referenceLabel" maxLength={180} style={fieldStyle} placeholder="Example: 1st Chapter Anniversary · November 2, 2026" />
        </Field>

        <div style={{ border: "1px solid #e2dccf", borderRadius: 12, padding: 12, background: "#faf8f2" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={selectAll} onChange={(event) => setSelectAll(event.target.checked)} style={{ width: 24, height: 24, flex: "0 0 24px" }} />
            <span><strong>Assign to all active members in this Chapter</strong><small style={{ display: "block", color: "#6b665c", marginTop: 2 }}>The server resolves the complete current Chapter member list; the UI does not need to load every member first.</small></span>
          </label>
        </div>

        {!selectAll ? (
          <div style={{ border: "1px solid #e2dccf", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 11, background: "#f7f4ec" }}>
              <label style={{ display: "grid", gap: 5, fontWeight: 800, fontSize: ".82rem" }}>
                Find recipient
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Member name or membership number" style={fieldStyle} />
              </label>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto", padding: 8 }}>
              {chapterMembers.length ? chapterMembers.map((member) => (
                <label key={member.id} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 46, padding: "7px 8px", borderBottom: "1px solid #eee9df" }}>
                  <input type="checkbox" checked={selected.includes(member.id)} onChange={() => toggleMember(member.id)} style={{ width: 22, height: 22, flex: "0 0 22px" }} />
                  <span><strong>{member.firstName} {member.lastName}</strong><small style={{ display: "block", color: "#6b665c" }}>{member.membershipNo}</small></span>
                </label>
              )) : <p style={{ color: "#6b665c", padding: 8 }}>No active members match this search in the selected Chapter.</p>}
            </div>
            <div style={{ padding: 10, background: "#faf8f2", color: "#6b665c", fontSize: ".83rem" }}><strong>{selected.length}</strong> member{selected.length === 1 ? "" : "s"} selected</div>
          </div>
        ) : null}

        {message ? <div role="status" style={successStyle}>{message}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy || !title.trim() || (!selectAll && selected.length === 0)} style={{ minHeight: 48 }}>
          {busy ? "Issuing Certificates…" : selectAll ? "Issue to All Active Chapter Members" : `Issue to ${selected.length || "Selected"} Member${selected.length === 1 ? "" : "s"}`}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5 }}><span style={{ fontWeight: 800, fontSize: ".82rem" }}>{label}</span>{children}</label>;
}

const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 44, border: "1px solid #d8d1c4", borderRadius: 10, padding: "9px 10px", background: "#fff", font: "inherit" };
const successStyle: React.CSSProperties = { padding: 11, borderRadius: 10, background: "#eef8ef", border: "1px solid #bcdcbc", color: "#245b2a" };
const errorStyle: React.CSSProperties = { padding: 11, borderRadius: 10, background: "#fff1f1", border: "1px solid #e8b5b5", color: "#7b2424" };
