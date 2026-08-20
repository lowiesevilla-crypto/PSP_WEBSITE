"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function MemberTransferForm({
  memberId,
  currentChapterId,
  chapters,
}: {
  memberId: string;
  currentChapterId: string;
  chapters: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();
  const targets = chapters.filter((chapter) => chapter.id !== currentChapterId);
  const [targetChapterId, setTargetChapterId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (targets.length === 0) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = targets.find((chapter) => chapter.id === targetChapterId);
    if (!target) {
      setMessage("Select a target chapter.");
      return;
    }
    if (!window.confirm(`Transfer this member to ${target.name}? Membership history will be preserved.`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/members/${memberId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ targetChapterId, reason }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to transfer member.");
      setMessage(payload.message ?? "Member transferred.");
      setTargetChapterId("");
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to transfer member.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 14 }}>
      <strong>Transfer Chapter</strong>
      <select value={targetChapterId} onChange={(event) => setTargetChapterId(event.target.value)} required style={{ minHeight: 42, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }}>
        <option value="">Select target chapter</option>
        {targets.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} ({chapter.code})</option>)}
      </select>
      <input value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={1000} placeholder="Reason for transfer" style={{ minHeight: 42, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
      <button type="submit" disabled={submitting} className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff", opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Transferring…" : "Transfer Member"}
      </button>
      {message ? <div role="status" style={{ fontSize: ".84rem", color: "#665b47" }}>{message}</div> : null}
    </form>
  );
}
