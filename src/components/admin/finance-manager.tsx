"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Option { id: string; name: string }
interface AssessmentTypeOption { code: string; name: string }
type BillingScope = "CHAPTER" | "NATIONAL";

export function FinanceManager({ chapters, assessmentTypes }: { chapters: Option[]; assessmentTypes: AssessmentTypeOption[] }) {
  const router = useRouter();
  const [billingScope, setBillingScope] = useState<BillingScope>("CHAPTER");
  const [duesMessage, setDuesMessage] = useState<string | null>(null);
  const [rateMessage, setRateMessage] = useState<string | null>(null);
  const [assessmentMessage, setAssessmentMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const defaultChapterId = chapters[0]?.id ?? "";

  async function submitDues(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setDuesMessage(null);
    const form = new FormData(event.currentTarget);
    const dueAt = String(form.get("dueAt") || "");
    const coverageStart = String(form.get("coverageStart") || "");
    const coverageEnd = String(form.get("coverageEnd") || "");
    const response = await fetch("/api/admin/finance/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billingScope,
        chapterId: billingScope === "CHAPTER" ? String(form.get("chapterId") || "") : null,
        assessmentTypeCode: billingScope === "NATIONAL" ? "NATIONAL_DUES" : "MONTHLY_DUES",
        title: String(form.get("title") || ""),
        description: String(form.get("description") || "") || null,
        amount: Number(form.get("amount")),
        coverageStart: coverageStart ? new Date(`${coverageStart}T00:00:00`).toISOString() : null,
        coverageEnd: coverageEnd ? new Date(`${coverageEnd}T23:59:59`).toISOString() : null,
        dueAt: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok) {
      const message = billingScope === "NATIONAL"
        ? `National dues posted to ${payload.chargedMembers ?? 0} active member(s) across ${payload.chaptersCharged ?? 0} Chapter(s).`
        : `Chapter dues posted to ${payload.chargedMembers ?? 0} active member(s).`;
      setDuesMessage(message);
      event.currentTarget.reset();
      setBillingScope("CHAPTER");
      router.refresh();
    } else {
      setDuesMessage(payload.message ?? "Unable to create dues / bill.");
    }
  }

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
        billingScope: "CHAPTER",
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
    <div style={{ display: "grid", gap: 18 }}>
      <form className="app-panel" onSubmit={submitDues} data-dues-billing-version="chapter-national-v1" style={{ display: "grid", gap: 12, border: "1px solid #e2c96d" }}>
        <div>
          <small style={{ color: "#806500", fontWeight: 900 }}>PRIMARY BILLING</small>
          <h2 style={{ margin: "5px 0 4px" }}>Create Dues / Bill</h2>
          <p style={{ margin: 0, color: "#6b665c", lineHeight: 1.5 }}>
            Chapter Admin can bill only an authorized Chapter. National Admin can choose one Chapter or post National Dues to every active Chapter member.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label>Billing Scope
            <select value={billingScope} onChange={(event) => setBillingScope(event.target.value as BillingScope)}>
              <option value="CHAPTER">Specific Chapter</option>
              <option value="NATIONAL">National · all active Chapters (National Admin only)</option>
            </select>
          </label>
          <label>Chapter
            <select name="chapterId" defaultValue={defaultChapterId} disabled={billingScope === "NATIONAL"} required={billingScope === "CHAPTER"}>
              <option value="">Select Chapter</option>
              {chapterOptions}
            </select>
          </label>
          <label>Dues Type
            <input value={billingScope === "NATIONAL" ? "National Dues" : "Monthly Chapter Dues"} readOnly aria-readonly="true" />
          </label>
          <label>Amount to Bill (PHP)
            <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" />
          </label>
        </div>
        <label>Bill Title<input name="title" required maxLength={200} placeholder={billingScope === "NATIONAL" ? "Example: National Dues - September 2026" : "Example: Chapter Monthly Dues - September 2026"} /></label>
        <label>Description<textarea name="description" rows={2} maxLength={2000} placeholder="Optional billing description or remarks" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          <label>Coverage From<input name="coverageStart" type="date" /></label>
          <label>Coverage To<input name="coverageEnd" type="date" /></label>
          <label>Due Date<input name="dueAt" type="date" /></label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Creating bill…" : billingScope === "NATIONAL" ? "Post National Dues" : "Post Chapter Dues"}</button>
        {duesMessage && <p role="status" style={{ margin: 0, fontWeight: 800, color: duesMessage.startsWith("Unable") || duesMessage.includes("permission") ? "#8b1e1e" : "#245b2a" }}>{duesMessage}</p>}
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
        <form className="app-panel" onSubmit={submitRate} style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Effective-Dated Rate</h2>
          <label>Chapter<select name="chapterId" defaultValue={defaultChapterId} required><option value="">Select chapter</option>{chapterOptions}</select></label>
          <label>Assessment Type<select name="assessmentTypeCode" required><option value="">Select type</option>{typeOptions}</select></label>
          <label>Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label>Effective From<input name="effectiveFrom" type="datetime-local" required /></label>
          <button className="btn btn-primary" disabled={busy}>Save Rate</button>
          {rateMessage && <p role="status" style={{ margin: 0, color: "#6b665c" }}>{rateMessage}</p>}
        </form>

        <form className="app-panel" onSubmit={submitAssessment} style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Other Assessment / Collection</h2>
          <label>Chapter<select name="chapterId" defaultValue={defaultChapterId} required><option value="">Select chapter</option>{chapterOptions}</select></label>
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
    </div>
  );
}
