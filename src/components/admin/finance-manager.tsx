"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Option { id: string; name: string }
interface AssessmentTypeOption { code: string; name: string }

export function FinanceManager({ chapters, assessmentTypes }: { chapters: Option[]; assessmentTypes: AssessmentTypeOption[] }) {
  const router = useRouter();
  const [rateMessage, setRateMessage] = useState<string | null>(null);
  const [assessmentMessage, setAssessmentMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setRateMessage(null);
    const form = new FormData(event.currentTarget);
    const effectiveFrom = String(form.get("effectiveFrom") || "");
    const response = await fetch("/api/admin/finance/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterId: String(form.get("chapterId") || ""),
        assessmentTypeCode: String(form.get("assessmentTypeCode") || ""),
        amount: Number(form.get("amount")),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setRateMessage(response.ok ? "Rate added. Historical rates remain preserved." : payload.message ?? "Unable to save rate.");
    if (response.ok) router.refresh();
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setAssessmentMessage(null);
    const form = new FormData(event.currentTarget);
    const iso = (name: string) => {
      const value = String(form.get(name) || "");
      return value ? new Date(value).toISOString() : null;
    };
    const amountText = String(form.get("amount") || "").trim();
    const response = await fetch("/api/admin/finance/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterId: String(form.get("chapterId") || ""),
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
    setBusy(false);
    setAssessmentMessage(response.ok ? `Assessment posted to ${payload.chargedMembers ?? 0} active member(s).` : payload.message ?? "Unable to post assessment.");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  const chapterOptions = chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>);
  const typeOptions = assessmentTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
      <form className="app-panel" onSubmit={submitRate} style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Effective-Dated Rate</h2>
        <label>Chapter<select name="chapterId" required><option value="">Select chapter</option>{chapterOptions}</select></label>
        <label>Assessment Type<select name="assessmentTypeCode" required><option value="">Select type</option>{typeOptions}</select></label>
        <label>Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Effective From<input name="effectiveFrom" type="datetime-local" required /></label>
        <button className="btn btn-primary" disabled={busy}>Save Rate</button>
        {rateMessage && <p role="status" style={{ margin: 0, color: "#6b665c" }}>{rateMessage}</p>}
      </form>

      <form className="app-panel" onSubmit={submitAssessment} style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Post Assessment</h2>
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
        <button className="btn btn-primary" disabled={busy}>Post to Active Members</button>
        {assessmentMessage && <p role="status" style={{ margin: 0, color: "#6b665c" }}>{assessmentMessage}</p>}
      </form>
    </div>
  );
}
