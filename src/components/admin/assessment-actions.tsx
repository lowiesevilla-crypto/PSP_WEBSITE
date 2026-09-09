"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AssessmentActionInput = {
  id: string;
  title: string;
  description: string;
  amount: string;
  coverageStart: string;
  coverageEnd: string;
  dueAt: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "CANCELLED";
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
  const [busy, setBusy] = useState<"edit" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function edit() {
    if (busy) return;
    const title = window.prompt("Bill title", assessment.title);
    if (title === null) return;
    const amount = window.prompt("Amount to bill (PHP)", assessment.amount);
    if (amount === null) return;
    const dueAt = window.prompt("Due date (YYYY-MM-DD). Leave blank if no due date.", dateInput(assessment.dueAt));
    if (dueAt === null) return;
    const coverageStart = window.prompt("Coverage from (YYYY-MM-DD). Leave blank if none.", dateInput(assessment.coverageStart));
    if (coverageStart === null) return;
    const coverageEnd = window.prompt("Coverage to (YYYY-MM-DD). Leave blank if none.", dateInput(assessment.coverageEnd));
    if (coverageEnd === null) return;
    const description = window.prompt("Description / remarks. Leave blank if none.", assessment.description);
    if (description === null) return;

    setBusy("edit");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/finance/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: Number(amount),
          description: description || null,
          coverageStart: phtDateBoundaryIso(coverageStart),
          coverageEnd: phtDateBoundaryIso(coverageEnd, true),
          dueAt: phtDateBoundaryIso(dueAt, true),
          status: assessment.status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.message ?? "Unable to update bill.");
        return;
      }
      setMessage("Bill updated.");
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
      router.refresh();
    } catch {
      setMessage("Unable to delete bill because the server could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-table-actions">
      <button type="button" className="btn" onClick={edit} disabled={busy !== null} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>
        {busy === "edit" ? "Saving..." : "Edit"}
      </button>
      <button type="button" className="btn" onClick={remove} disabled={busy !== null || assessment.status === "CANCELLED"} style={{ border: "1px solid #f0b4aa", background: "#fff1f0", color: "#8b1e1e" }}>
        {busy === "delete" ? "Deleting..." : "Delete"}
      </button>
      {message ? <small role="status" style={{ color: message.startsWith("Unable") ? "#8b1e1e" : "#245b2a", fontWeight: 800 }}>{message}</small> : null}
    </div>
  );
}
