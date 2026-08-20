"use client";

import { FormEvent, useState } from "react";

interface ChapterOption { id: string; name: string; code: string }
interface EventItem { id: string; title: string; status: string; chapterId: string | null; startsAt: string; venue: string | null }

export function EventManager({ chapters, initialEvents, canNational }: { chapters: ChapterOption[]; initialEvents: EventItem[]; canNational: boolean }) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState({ chapterId: chapters[0]?.id ?? "", title: "", description: "", venue: "", startsAt: "", endsAt: "", publish: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        chapterId: form.chapterId === "NATIONAL" ? null : form.chapterId,
        title: form.title,
        description: form.description,
        venue: form.venue || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        publish: form.publish,
      };
      const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { event?: EventItem; message?: string };
      if (!response.ok || !result.event) throw new Error(result.message ?? "Unable to create event.");
      setEvents((current) => [{ ...result.event!, startsAt: String(result.event!.startsAt) }, ...current]);
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
        <label style={labelStyle}><strong>Audience</strong><select required value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} style={fieldStyle}>{canNational ? <option value="NATIONAL">National / All Members</option> : null}{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} ({chapter.code})</option>)}</select></label>
        <label style={labelStyle}><strong>Title</strong><input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}><strong>Description</strong><textarea required rows={4} maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...fieldStyle, resize: "vertical" }} /></label>
        <label style={labelStyle}><strong>Venue</strong><input maxLength={300} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} style={fieldStyle} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label style={labelStyle}><strong>Starts</strong><input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} style={fieldStyle} /></label>
          <label style={labelStyle}><strong>Ends</strong><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} style={fieldStyle} /></label>
        </div>
        <label style={{ display: "flex", gap: 9, alignItems: "center" }}><input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} /> Publish immediately</label>
        {error ? <div role="alert" style={{ color: "#7b2424" }}>{error}</div> : null}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Create Event"}</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {events.map((item) => (
          <div className="app-panel" key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div><strong>{item.title}</strong><div style={{ color: "#6b665c", marginTop: 4 }}>{new Date(item.startsAt).toLocaleString()} · {item.status}</div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.status === "DRAFT" ? <button className="btn btn-primary" onClick={() => void setStatus(item.id, "PUBLISHED")}>Publish</button> : null}
              {item.status !== "CANCELLED" ? <button className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }} onClick={() => void setStatus(item.id, "CANCELLED")}>Cancel</button> : null}
              {item.status === "PUBLISHED" ? <button className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }} onClick={() => void setStatus(item.id, "COMPLETED")}>Complete</button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 6 };
const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 46, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px", font: "inherit" };
