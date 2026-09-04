"use client";

import { FormEvent, useState } from "react";

interface ChapterOption { id: string; name: string; code: string }
interface EventItem {
  id: string;
  title: string;
  status: string;
  chapterId: string | null;
  startsAt: string;
  venue: string | null;
  imageUrl: string | null;
}

export function EventManager({ chapters, initialEvents, canNational }: { chapters: ChapterOption[]; initialEvents: EventItem[]; canNational: boolean }) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState({ chapterId: chapters[0]?.id ?? "", title: "", description: "", venue: "", startsAt: "", endsAt: "", publish: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const formElement = event.currentTarget;
    const payload = new FormData(formElement);
    payload.set("chapterId", form.chapterId === "NATIONAL" ? "" : form.chapterId);
    payload.set("title", form.title);
    payload.set("description", form.description);
    payload.set("venue", form.venue);
    payload.set("startsAt", new Date(form.startsAt).toISOString());
    payload.set("endsAt", form.endsAt ? new Date(form.endsAt).toISOString() : "");
    payload.set("publish", String(form.publish));

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/events", { method: "POST", body: payload });
      const result = (await response.json()) as { event?: EventItem; message?: string };
      if (!response.ok || !result.event) throw new Error(result.message ?? "Unable to create event.");
      setEvents((current) => [{ ...result.event!, startsAt: String(result.event!.startsAt) }, ...current]);
      formElement.reset();
      setForm((current) => ({ ...current, title: "", description: "", venue: "", startsAt: "", endsAt: "", publish: false }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create event.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "PUBLISHED" | "CANCELLED" | "COMPLETED") {
    const response = await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const result = (await response.json()) as { event?: EventItem };
    if (response.ok && result.event) setEvents((current) => current.map((item) => item.id === id ? { ...item, status: result.event!.status } : item));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form className="app-panel" onSubmit={create} style={{ display: "grid", gap: 13 }}>
        <h2 style={{ margin: 0 }}>Create Event</h2>
        <label style={labelStyle}><strong>Audience</strong><select name="chapterId" required value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} disabled={busy} style={fieldStyle}>{canNational ? <option value="NATIONAL">National / All Members</option> : null}{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} ({chapter.code})</option>)}</select></label>
        <label style={labelStyle}><strong>Title</strong><input name="title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={busy} style={fieldStyle} /></label>
        <label style={labelStyle}><strong>Description</strong><textarea name="description" required rows={4} maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} style={{ ...fieldStyle, resize: "vertical" }} /></label>
        <label style={labelStyle}><strong>Venue</strong><input name="venue" maxLength={300} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} disabled={busy} style={fieldStyle} /></label>
        <label style={labelStyle}>
          <strong>Event Image <small style={{ color: "#746b5b", fontWeight: 500 }}>(optional · JPG, PNG or WEBP · max 5 MB)</small></strong>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} style={fieldStyle} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label style={labelStyle}><strong>Starts</strong><input name="startsAt" required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} disabled={busy} style={fieldStyle} /></label>
          <label style={labelStyle}><strong>Ends</strong><input name="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} disabled={busy} style={fieldStyle} /></label>
        </div>
        <label style={{ display: "flex", gap: 9, alignItems: "center" }}><input name="publish" type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} disabled={busy} /> Publish immediately</label>
        {error ? <div role="alert" style={{ color: "#7b2424" }}>{error}</div> : null}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Create Event"}</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {events.map((item) => (
          <div className="app-panel" key={item.id} style={{ display: "grid", gap: 12, overflow: "hidden" }}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 14 }} /> : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <div><strong>{item.title}</strong><div style={{ color: "#6b665c", marginTop: 4 }}>{new Date(item.startsAt).toLocaleString()} · {item.status}</div></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.status === "DRAFT" ? <button className="btn btn-primary" disabled={busy} onClick={() => void setStatus(item.id, "PUBLISHED")}>Publish</button> : null}
                {item.status !== "CANCELLED" ? <button className="btn" disabled={busy} style={{ border: "1px solid #ddd5c1", background: "#fff" }} onClick={() => void setStatus(item.id, "CANCELLED")}>Cancel</button> : null}
                {item.status === "PUBLISHED" ? <button className="btn" disabled={busy} style={{ border: "1px solid #ddd5c1", background: "#fff" }} onClick={() => void setStatus(item.id, "COMPLETED")}>Complete</button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 6 };
const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 46, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px", font: "inherit" };
