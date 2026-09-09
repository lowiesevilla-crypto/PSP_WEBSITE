"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "DRAFT" | "ACTIVE" | "CLOSED" | "CANCELLED";

type AssessmentActionInput = {
  id: string;
  title: string;
  description: string;
  amount: string;
  coverageStart: string;
  coverageEnd: string;
  dueAt: string;
  status: Status;
};

type MemberChoice = { id: string; name: string; membershipNo: string };
type BillDetails = {
  paymentCount: number;
  chargedMemberIds: string[];
  availableMembers: MemberChoice[];
};

const PSP_TIMEZONE_OFFSET = "+08:00";

function phtDateBoundaryIso(value: string, endOfDay = false) {
  if (!value) return null;
  const localTime = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${localTime}${PSP_TIMEZONE_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateInput(value: string) {
  return value ? value.slice(0, 10) : "";
}

export function AssessmentActions({ assessment }: { assessment: AssessmentActionInput }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<BillDetails | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || details || busy === "load") return;
    let cancelled = false;
    setBusy("load");
    setMessage(null);
    fetch(`/api/admin/finance/assessments/${assessment.id}`, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message ?? "Unable to load bill details.");
        if (cancelled) return;
        setDetails(payload);
        setSelectedMemberIds(new Set(payload.chargedMemberIds ?? []));
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load bill details.");
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assessment.id, busy, details, open]);

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/finance/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") || ""),
          amount: Number(form.get("amount")),
          description: String(form.get("description") || "") || null,
          coverageStart: phtDateBoundaryIso(String(form.get("coverageStart") || "")),
          coverageEnd: phtDateBoundaryIso(String(form.get("coverageEnd") || ""), true),
          dueAt: phtDateBoundaryIso(String(form.get("dueAt") || ""), true),
          status: String(form.get("status") || "ACTIVE"),
          memberIds: details && details.paymentCount === 0 ? Array.from(selectedMemberIds) : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? "Unable to update bill.");
        return;
      }
      setMessage("Bill updated.");
      setDetails(null);
      router.refresh();
    } catch {
      setMessage("Unable to update bill because the server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    const confirmed = window.confirm(`Delete/cancel this bill?\n\n${assessment.title}\n\nUnpaid charges will be removed. If payment activity already exists, PSP will cancel the bill but keep payment/receipt history.`);
    if (!confirmed) return;
    setBusy("delete");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/finance/assessments/${assessment.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? "Unable to delete bill.");
        return;
      }
      setMessage(payload.mode === "deleted" ? "Bill deleted and unpaid charges removed." : "Bill cancelled. Payment history was kept.");
      setOpen(false);
      router.refresh();
    } catch {
      setMessage("Unable to delete bill because the server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-table-actions" data-assessment-editor-version="full-panel-v1">
      <button type="button" className="btn" onClick={() => setOpen((value) => !value)} disabled={busy === "delete"} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>
        {open ? "Close" : "Edit"}
      </button>
      <button type="button" className="btn" onClick={remove} disabled={busy !== null || assessment.status === "CANCELLED"} style={{ border: "1px solid #f0b4aa", background: "#fff1f0", color: "#8b1e1e" }}>
        {busy === "delete" ? "Deleting..." : "Delete"}
      </button>
      {message ? <small role="status" style={{ color: message.startsWith("Unable") || message.includes("cannot") ? "#8b1e1e" : "#245b2a", fontWeight: 800 }}>{message}</small> : null}
      {open ? (
        <form onSubmit={save} style={{ display: "grid", gap: 10, minWidth: 300, maxWidth: 520, padding: 12, border: "1px solid #ddd5c1", borderRadius: 12, background: "#fff" }}>
          <strong>Edit Bill</strong>
          <label>Bill Title<input name="title" defaultValue={assessment.title} required maxLength={200} /></label>
          <label>Description<textarea name="description" defaultValue={assessment.description} rows={3} maxLength={2000} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            <label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={assessment.amount} required /></label>
            <label>Status<select name="status" defaultValue={assessment.status}><option value="ACTIVE">Active</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option><option value="DRAFT">Draft</option></select></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            <label>Due Date<input name="dueAt" type="date" defaultValue={dateInput(assessment.dueAt)} /></label>
            <label>Coverage From<input name="coverageStart" type="date" defaultValue={dateInput(assessment.coverageStart)} /></label>
            <label>Coverage To<input name="coverageEnd" type="date" defaultValue={dateInput(assessment.coverageEnd)} /></label>
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            <strong>Assigned Members</strong>
            {busy === "load" ? <small>Loading members...</small> : null}
            {details?.paymentCount ? <small style={{ color: "#8b1e1e", fontWeight: 800 }}>This bill already has payment activity, so the member list and amount are locked for ledger safety.</small> : null}
            {details && details.paymentCount === 0 ? (
              <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto", border: "1px solid #eee0bd", borderRadius: 10, padding: 8 }}>
                {details.availableMembers.map((member) => (
                  <label key={member.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={selectedMemberIds.has(member.id)} onChange={() => toggleMember(member.id)} style={{ width: "auto" }} />
                    <span>{member.name} <small style={{ color: "#746b5b" }}>{member.membershipNo}</small></span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <button className="btn btn-primary" disabled={busy !== null}>{busy === "save" ? "Saving..." : "Save Changes"}</button>
        </form>
      ) : null}
    </div>
  );
}
