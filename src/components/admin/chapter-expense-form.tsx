"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ChapterOption {
  id: string;
  name: string;
  code: string;
}

export function ChapterExpenseForm({ chapters }: { chapters: ChapterOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const expenseDate = String(form.get("expenseDate") ?? "");
    const payload = {
      chapterId: String(form.get("chapterId") ?? ""),
      title: String(form.get("title") ?? ""),
      category: String(form.get("category") ?? "OPERATING"),
      amount: String(form.get("amount") ?? ""),
      expenseDate: expenseDate ? new Date(expenseDate).toISOString() : "",
      vendor: String(form.get("vendor") ?? ""),
      receiptReference: String(form.get("receiptReference") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Unable to record expense.");
      event.currentTarget.reset();
      setMessage("Expense recorded in the Chapter finance ledger.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="app-panel" onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div>
        <small style={{ color: "#806500", fontWeight: 900 }}>CHAPTER EXPENSE LEDGER</small>
        <h2 style={{ margin: "5px 0 0" }}>Record Expense</h2>
      </div>
      <label>Chapter
        <select name="chapterId" required disabled={busy}>
          {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}
        </select>
      </label>
      <label>Expense Title<input name="title" required minLength={3} maxLength={180} disabled={busy} placeholder="Venue rental, food, supplies..." /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label>Category<input name="category" maxLength={80} disabled={busy} defaultValue="OPERATING" /></label>
        <label>Amount<input name="amount" required inputMode="decimal" pattern="\\d+(\\.\\d{1,2})?" disabled={busy} placeholder="0.00" /></label>
        <label>Date<input name="expenseDate" required type="date" disabled={busy} /></label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label>Vendor / Payee<input name="vendor" maxLength={160} disabled={busy} /></label>
        <label>Receipt / Reference<input name="receiptReference" maxLength={160} disabled={busy} /></label>
      </div>
      <label>Notes<textarea name="notes" rows={3} maxLength={2000} disabled={busy} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save Expense"}</button>
      {message ? <p role="status" style={{ margin: 0, color: "#6b665c" }}>{message}</p> : null}
    </form>
  );
}
