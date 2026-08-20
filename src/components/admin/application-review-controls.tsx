"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const options = [
  ["UNDER_REVIEW", "Under Review"],
  ["CORRECTION_REQUIRED", "Correction Required"],
  ["PENDING_REQUIREMENTS", "Pending Requirements"],
  ["APPROVED", "Approve Member"],
  ["REJECTED", "Reject Application"],
] as const;

export function ApplicationReviewControls({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof options)[number][0]>("UNDER_REVIEW");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "APPROVED") {
      const confirmed = window.confirm(
        "Approve this applicant? This will create the official member record, membership number, and member access assignment.",
      );
      if (!confirmed) return;
    }

    if (status === "REJECTED" && !reviewNotes.trim()) {
      setMessage("Please enter a reason before rejecting the application.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });
      const payload = (await response.json()) as { message?: string; member?: { membershipNo?: string } };
      if (!response.ok) throw new Error(payload.message ?? "Unable to update the application.");

      setMessage(
        payload.member?.membershipNo
          ? `Approved. Membership No. ${payload.member.membershipNo}`
          : "Application status updated.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 14 }}>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as (typeof options)[number][0])}
        style={{ minHeight: 44, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <textarea
        value={reviewNotes}
        onChange={(event) => setReviewNotes(event.target.value)}
        placeholder="Review notes / correction request / rejection reason"
        maxLength={3000}
        rows={3}
        style={{ border: "1px solid #ded7c7", borderRadius: 10, padding: 10, resize: "vertical" }}
      />
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Saving…" : "Apply Review Action"}
      </button>
      {message ? <div role="status" style={{ fontSize: ".85rem", color: "#665b47" }}>{message}</div> : null}
    </form>
  );
}
