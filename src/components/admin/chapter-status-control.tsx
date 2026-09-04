"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChapterStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";

export function ChapterStatusControl({
  chapterId,
  chapterName,
  status,
}: {
  chapterId: string;
  chapterName: string;
  status: ChapterStatus;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<ChapterStatus>(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus() {
    if (busy || nextStatus === status) return;
    if (nextStatus === "ARCHIVED") {
      const confirmed = window.confirm(`Archive ${chapterName}? Archived chapters remain in history but should no longer be used for current operations.`);
      if (!confirmed) return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as { message?: string; chapter?: { status?: ChapterStatus } };
      if (!response.ok) throw new Error(result.message ?? "Unable to update chapter status.");
      setMessage(`Chapter status changed to ${result.chapter?.status ?? nextStatus}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update chapter status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee7d8" }}>
      <strong>Chapter Lifecycle</strong>
      <p style={{ margin: 0, color: "#746b5b", fontSize: ".84rem", lineHeight: 1.45 }}>
        National Administration can activate, deactivate, suspend, or archive a chapter. This does not delete historical records.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ChapterStatus)} disabled={busy} style={{ minHeight: 44 }}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive / Deactivated</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="button" className="btn" disabled={busy || nextStatus === status} onClick={() => void updateStatus()} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>
          {busy ? "Updating…" : "Update"}
        </button>
      </div>
      {message ? <div role="status" style={{ color: "#665b47", fontSize: ".84rem" }}>{message}</div> : null}
    </section>
  );
}
