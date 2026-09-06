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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("audience", audience);
    if (audience === "NATIONAL") form.delete("chapterId");

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Unable to publish announcement.");
      formElement.reset();
      setMessage(payload.announcement?.isPublic ? "Announcement published to members and the public PSP website." : "Announcement published to members only.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="app-panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Publish Announcement</h2>
      <label>Audience
        <select value={audience} onChange={(event) => setAudience(event.target.value as "CHAPTER" | "NATIONAL")} disabled={busy}>
          {canPublishNational && <option value="NATIONAL">National / All Members</option>}
          <option value="CHAPTER">Chapter Only</option>
        </select>
      </label>
      {audience === "CHAPTER" && <label>Chapter
        <select name="chapterId" required disabled={busy}>
          <option value="">Select chapter</option>
          {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
        </select>
      </label>}
      <label>Title<input name="title" required minLength={3} maxLength={160} disabled={busy} /></label>
      <label>Message<textarea name="body" required minLength={3} maxLength={5000} rows={6} disabled={busy} /></label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Announcement Image <small style={{ color: "#746b5b" }}>(optional · JPG, PNG or WEBP · max 5 MB)</small></span>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" disabled={busy} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label>Starts<input type="datetime-local" name="startsAt" disabled={busy} /></label>
        <label>Expires<input type="datetime-local" name="expiresAt" disabled={busy} /></label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPinned" style={{ width: "auto" }} disabled={busy} /> Pin announcement</label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: 12, border: "1px solid #ddd5c1", borderRadius: 12, background: "#fffaf0" }}>
        <input type="checkbox" name="isPublic" style={{ width: "auto", marginTop: 3 }} disabled={busy} />
        <span><strong>Show on the public PSP website</strong><small style={{ display: "block", marginTop: 3, color: "#746b5b", lineHeight: 1.45 }}>Only the announcement text, Chapter attribution and dates are shown publicly. Uploaded images remain protected for authenticated members.</small></span>
      </label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Publishing…" : "Publish"}</button>
      {message && <p role="status" style={{ margin: 0, color: "#6b665c" }}>{message}</p>}
    </form>
  );
}
