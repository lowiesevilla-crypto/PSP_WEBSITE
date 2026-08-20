"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Chapter = { id: string; name: string };
type Member = { id: string; chapterId: string; membershipNo: string; firstName: string; lastName: string };
type Position = { id: string; chapterId: string; name: string };
type Committee = { id: string; chapterId: string; name: string };

export function OrganizationManager({ chapters, members, positions, committees }: { chapters: Chapter[]; members: Member[]; positions: Position[]; committees: Committee[] }) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chapterMembers = useMemo(() => members.filter((member) => member.chapterId === chapterId), [members, chapterId]);
  const chapterPositions = useMemo(() => positions.filter((position) => position.chapterId === chapterId), [positions, chapterId]);
  const chapterCommittees = useMemo(() => committees.filter((committee) => committee.chapterId === chapterId), [committees, chapterId]);

  async function submit(action: string, form: HTMLFormElement) {
    if (busy) return;
    setBusy(true); setMessage(null);
    const data = new FormData(form);
    const iso = (name: string) => { const value = String(data.get(name) || ""); return value ? new Date(value).toISOString() : null; };
    const body: Record<string, unknown> = { action, chapterId };
    if (action === "POSITION") Object.assign(body, { name: String(data.get("name") || ""), code: String(data.get("code") || ""), level: Number(data.get("level") || 0) });
    if (action === "OFFICER") Object.assign(body, { positionId: String(data.get("positionId") || ""), memberId: String(data.get("memberId") || ""), startsAt: iso("startsAt"), endsAt: iso("endsAt") });
    if (action === "COMMITTEE") Object.assign(body, { name: String(data.get("name") || ""), code: String(data.get("code") || ""), description: String(data.get("description") || "") || null });
    if (action === "COMMITTEE_MEMBER") Object.assign(body, { committeeId: String(data.get("committeeId") || ""), memberId: String(data.get("memberId") || ""), roleLabel: String(data.get("roleLabel") || "") || null, startsAt: iso("startsAt"), endsAt: iso("endsAt") });
    const response = await fetch("/api/admin/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(payload.message ?? "Unable to update organization."); return; }
    form.reset(); setMessage("Organization updated."); router.refresh();
  }

  const memberOptions = chapterMembers.map((member) => <option key={member.id} value={member.id}>{member.membershipNo} · {member.firstName} {member.lastName}</option>);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="app-panel">
        <label>Manage Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
        {message && <p role="status" style={{ color: "#6b665c" }}>{message}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        <form className="app-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit("POSITION", event.currentTarget); }} style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Add Position</h2>
          <label>Name<input name="name" required /></label><label>Code<input name="code" required /></label><label>Hierarchy Level<input name="level" type="number" min="0" max="100" defaultValue="0" /></label>
          <button className="btn btn-primary" disabled={busy}>Add Position</button>
        </form>

        <form className="app-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit("OFFICER", event.currentTarget); }} style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Assign Officer</h2>
          <label>Position<select name="positionId" required><option value="">Select position</option>{chapterPositions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
          <label>Member<select name="memberId" required><option value="">Select member</option>{memberOptions}</select></label>
          <label>Term Start<input name="startsAt" type="datetime-local" required /></label><label>Term End<input name="endsAt" type="datetime-local" /></label>
          <button className="btn btn-primary" disabled={busy}>Assign Officer</button>
        </form>

        <form className="app-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit("COMMITTEE", event.currentTarget); }} style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Add Committee</h2>
          <label>Name<input name="name" required /></label><label>Code<input name="code" required /></label><label>Description<textarea name="description" rows={3} /></label>
          <button className="btn btn-primary" disabled={busy}>Add Committee</button>
        </form>

        <form className="app-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit("COMMITTEE_MEMBER", event.currentTarget); }} style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Assign Committee Member</h2>
          <label>Committee<select name="committeeId" required><option value="">Select committee</option>{chapterCommittees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></label>
          <label>Member<select name="memberId" required><option value="">Select member</option>{memberOptions}</select></label>
          <label>Role / Label<input name="roleLabel" /></label><label>Start<input name="startsAt" type="datetime-local" required /></label><label>End<input name="endsAt" type="datetime-local" /></label>
          <button className="btn btn-primary" disabled={busy}>Assign Member</button>
        </form>
      </div>
    </div>
  );
}
