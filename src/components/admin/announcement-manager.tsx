"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: "CHAPTER" | "NATIONAL";
  startsAt: string | null;
  expiresAt: string | null;
  isPinned: boolean;
  isPublic: boolean;
  chapterName: string | null;
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AnnouncementManager({ chapters, canPublishNational, initialAnnouncements }: { chapters: Array<{ id: string; name: string }>; canPublishNational: boolean; initialAnnouncements: AnnouncementItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [audience, setAudience] = useState<"CHAPTER" | "NATIONAL">(canPublishNational ? "NATIONAL" : "CHAPTER");
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);

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

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
      startsAt: form.get("startsAt") ? new Date(String(form.get("startsAt"))).toISOString() : null,
      expiresAt: form.get("expiresAt") ? new Date(String(form.get("expiresAt"))).toISOString() : null,
      isPinned: form.get("isPinned") === "on",
      isPublic: form.get("isPublic") === "on",
    };
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/announcements/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Unable to update announcement.");
      setEditing(null);
      setMessage(payload.isPublic ? "Announcement updated and visible on the public PSP website until expiration." : "Announcement updated as members only.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update announcement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AnnouncementItem) {
    if (busy || !window.confirm(`Delete "${item.title}"? This removes it from the public website and member announcements.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/announcements/${item.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Unable to delete announcement.");
      setMessage("Announcement deleted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
    <section className="app-panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Manage Existing Announcements</h2>
      {editing ? (
        <form onSubmit={update} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid #ddd5c1", borderRadius: 12, background: "#fffaf0" }}>
          <strong>Edit: {editing.title}</strong>
          <label>Title<input name="title" required minLength={3} maxLength={160} defaultValue={editing.title} disabled={busy} /></label>
          <label>Message<textarea name="body" required minLength={3} maxLength={5000} rows={5} defaultValue={editing.body} disabled={busy} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label>Starts<input type="datetime-local" name="startsAt" defaultValue={toDateTimeLocal(editing.startsAt)} disabled={busy} /></label>
            <label>Expires<input type="datetime-local" name="expiresAt" defaultValue={toDateTimeLocal(editing.expiresAt)} disabled={busy} /></label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPinned" defaultChecked={editing.isPinned} style={{ width: "auto" }} disabled={busy} /> Pin announcement</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPublic" defaultChecked={editing.isPublic} style={{ width: "auto" }} disabled={busy} /> Show on public PSP website</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
            <button className="btn" type="button" disabled={busy} onClick={() => setEditing(null)} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Cancel</button>
          </div>
        </form>
      ) : null}
      <div style={{ display: "grid", gap: 10 }}>
        {initialAnnouncements.length ? initialAnnouncements.map((item) => (
          <article key={item.id} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #eee7d8", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <strong>{item.title}</strong>
                <div style={{ color: "#6b665c", fontSize: ".88rem", marginTop: 3 }}>{item.audience === "NATIONAL" ? "National" : item.chapterName ?? "Chapter"} · {item.isPublic ? "Public website" : "Members only"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" type="button" disabled={busy} onClick={() => setEditing(item)} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Edit</button>
                <button className="btn" type="button" disabled={busy} onClick={() => void remove(item)} style={{ border: "1px solid #f1b4ad", background: "#fff1ef", color: "#8a1c13" }}>Delete</button>
              </div>
            </div>
          </article>
        )) : <p style={{ color: "#6b665c", margin: 0 }}>No announcements yet.</p>}
      </div>
    </section>
    </div>
  );
}
