"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementManager({ chapters, canPublishNational }: { chapters: Array<{ id: string; name: string }>; canPublishNational: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [audience, setAudience] = useState<"CHAPTER" | "NATIONAL">(canPublishNational ? "NATIONAL" : "CHAPTER");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const starts = String(form.get("startsAt") || "");
    const expires = String(form.get("expiresAt") || "");
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience,
        chapterId: audience === "CHAPTER" ? String(form.get("chapterId") || "") : null,
        title: String(form.get("title") || ""),
        body: String(form.get("body") || ""),
        startsAt: starts ? new Date(starts).toISOString() : null,
        expiresAt: expires ? new Date(expires).toISOString() : null,
        isPinned: form.get("isPinned") === "on",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message ?? "Unable to publish announcement.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Announcement published.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="app-panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Publish Announcement</h2>
      <label>Audience
        <select value={audience} onChange={(event) => setAudience(event.target.value as "CHAPTER" | "NATIONAL")}>
          {canPublishNational && <option value="NATIONAL">National / All Members</option>}
          <option value="CHAPTER">Chapter Only</option>
        </select>
      </label>
      {audience === "CHAPTER" && <label>Chapter
        <select name="chapterId" required>
          <option value="">Select chapter</option>
          {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
        </select>
      </label>}
      <label>Title<input name="title" required minLength={3} maxLength={160} /></label>
      <label>Message<textarea name="body" required minLength={3} maxLength={5000} rows={6} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label>Starts<input type="datetime-local" name="startsAt" /></label>
        <label>Expires<input type="datetime-local" name="expiresAt" /></label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPinned" style={{ width: "auto" }} /> Pin announcement</label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish"}</button>
      {message && <p role="status" style={{ margin: 0, color: "#6b665c" }}>{message}</p>}
    </form>
  );
}
