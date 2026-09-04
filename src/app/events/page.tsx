import Link from "next/link";
import { redirect } from "next/navigation";
import { contentMediaUrl } from "@/lib/content/media";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ audience: "NATIONAL" }, { audience: "CHAPTER", chapterId: member.chapterId }],
    },
    orderBy: { startsAt: "asc" },
    take: 100,
    include: { chapter: { select: { name: true } } },
  });

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Events</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Dashboard</Link>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>Events</p>
          <h1>National & Chapter Calendar</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {events.map((event) => {
            const imageUrl = contentMediaUrl("event", event.id, event.imageUrl);
            return (
              <article className="app-panel" key={event.id} style={{ display: "grid", gap: 10, overflow: "hidden" }}>
                {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 14 }} /> : null}
                <small style={{ color: "#806500", fontWeight: 900 }}>
                  {event.audience === "NATIONAL" ? "NATIONAL EVENT" : event.chapter?.name?.toUpperCase()}
                </small>
                <h2 style={{ margin: 0, overflowWrap: "anywhere" }}>{event.title}</h2>
                <p style={{ color: "#6b665c", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{event.description}</p>
                <div style={{ marginTop: 5, paddingTop: 10, borderTop: "1px solid #eee7d8" }}>
                  <strong>{new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Manila" }).format(event.startsAt)}</strong>
                  {event.venue ? <div style={{ marginTop: 5, color: "#6b665c", overflowWrap: "anywhere" }}>{event.venue}</div> : null}
                </div>
              </article>
            );
          })}
          {events.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No published events are currently scheduled.</p></div> : null}
        </div>
      </div>
    </main>
  );
}
