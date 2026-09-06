"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Option { id: string; name: string; code: string }
interface AssessmentTypeOption { code: string; name: string }

export function FinanceManager({ chapters, assessmentTypes }: { chapters: Option[]; assessmentTypes: AssessmentTypeOption[] }) {
  const router = useRouter();
  const [rateMessage, setRateMessage] = useState<string | null>(null);
  const [assessmentMessage, setAssessmentMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"rate" | "assessment" | null>(null);
  const busy = busyAction !== null;

  async function submitRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusyAction("rate");
    setRateMessage(null);
    const form = new FormData(event.currentTarget);
    const chapterId = String(form.get("chapterId") || "");
    const effectiveFrom = String(form.get("effectiveFrom") || "");
    try {
      const response = await fetch("/api/admin/finance/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          assessmentTypeCode: String(form.get("assessmentTypeCode") || ""),
          amount: Number(form.get("amount")),
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRateMessage(payload.message ?? "Unable to save rate.");
        return;
      }
      const savedId = typeof payload.rate?.id === "string" ? payload.rate.id : "";
      const query = new URLSearchParams({ view: "rates", chapter: chapterId, notice: "rate" });
      if (savedId) query.set("saved", savedId);
      router.push(`/admin/finance?${query.toString()}`);
      router.refresh();
    } catch {
      setRateMessage("Unable to save rate. Check the connection and try again.");
    } finally {
      setBusyAction(null);
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusyAction("assessment");
    setAssessmentMessage(null);
    const form = new FormData(event.currentTarget);
    const chapterId = String(form.get("chapterId") || "");
    const iso = (name: string) => {
      const value = String(form.get(name) || "");
      return value ? new Date(value).toISOString() : null;
    };
    const amountText = String(form.get("amount") || "").trim();
    try {
      const response = await fetch("/api/admin/finance/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          assessmentTypeCode: String(form.get("assessmentTypeCode") || ""),
          title: String(form.get("title") || ""),
          description: String(form.get("description") || "") || null,
          amount: amountText ? Number(amountText) : undefined,
          coverageStart: iso("coverageStart"),
          coverageEnd: iso("coverageEnd"),
          dueAt: iso("dueAt"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssessmentMessage(payload.message ?? "Unable to post assessment.");
        return;
      }
      const savedId = typeof payload.assessment?.id === "string" ? payload.assessment.id : "";
      const chargedMembers = Number.isInteger(payload.chargedMembers) ? String(payload.chargedMembers) : "0";
      const query = new URLSearchParams({ view: "assessments", chapter: chapterId, notice: "assessment", chargedMembers });
      if (savedId) query.set("saved", savedId);
      router.push(`/admin/finance?${query.toString()}`);
      router.refresh();
    } catch {
      setAssessmentMessage("Unable to post assessment. Check the connection and try again.");
    } finally {
      setBusyAction(null);
    }
  }

  const chapterOptions = chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>);
  const typeOptions = assessmentTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
      <form className="app-panel" onSubmit={submitRate} style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Effective-Dated Rate</h2>
        <p style={{ margin: 0, color: "#746b5b", fontSize: ".84rem", lineHeight: 1.5 }}>After Save Rate succeeds, PSP opens the persisted Rates register for the exact Chapter so the saved record is immediately visible.</p>
        <label>Chapter<select name="chapterId" required><option value="">Select chapter</option>{chapterOptions}</select></label>
        <label>Assessment Type<select name="assessmentTypeCode" required><option value="">Select type</option>{typeOptions}</select></label>
        <label>Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Effective From<input name="effectiveFrom" type="datetime-local" required /></label>
        <button className="btn btn-primary" disabled={busy}>{busyAction === "rate" ? "Saving rate…" : "Save Rate"}</button>
        {rateMessage && <p role="alert" style={{ margin: 0, color: "#7b2424" }}>{rateMessage}</p>}
      </form>

      <form className="app-panel" onSubmit={submitAssessment} style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Post Assessment</h2>
        <p style={{ margin: 0, color: "#746b5b", fontSize: ".84rem", lineHeight: 1.5 }}>After posting succeeds, PSP opens the persisted Assessments register and shows how many ACTIVE members received the ledger charge.</p>
        <label>Chapter<select name="chapterId" required><option value="">Select chapter</option>{chapterOptions}</select></label>
        <label>Assessment Type<select name="assessmentTypeCode" required><option value="">Select type</option>{typeOptions}</select></label>
        <label>Title<input name="title" required maxLength={200} /></label>
        <label>Description<textarea name="description" rows={3} maxLength={2000} /></label>
        <label>Override Amount <small>(optional; otherwise current rate is used)</small><input name="amount" type="number" min="0.01" step="0.01" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <label>Coverage From<input name="coverageStart" type="datetime-local" /></label>
          <label>Coverage To<input name="coverageEnd" type="datetime-local" /></label>
          <label>Due Date<input name="dueAt" type="datetime-local" /></label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busyAction === "assessment" ? "Posting to active members…" : "Post to Active Members"}</button>
        {assessmentMessage && <p role="alert" style={{ margin: 0, color: "#7b2424" }}>{assessmentMessage}</p>}
      </form>
    </div>
  );
}
