import Link from "next/link";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      status: "PUBLISHED",
      OR: [
        { endsAt: null, startsAt: { gte: now } },
        { endsAt: { gt: now } },
      ],
    },
    orderBy: { startsAt: "asc" },
    take: 100,
    include: { chapter: { select: { name: true } } },
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" href="/" aria-label="Psi Sigma Phi Philippines Inc. home">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span className="brand-copy"><small>Ψ Σ Φ</small><span>Psi Sigma Phi Philippines Inc.</span></span>
          </Link>
          <div className="nav-actions"><Link className="btn btn-secondary" href="/member">Member Login</Link><Link className="btn btn-primary" href="/register">Register</Link></div>
        </div>
      </header>

      <div className="container app-main">
        <section className="public-archive-hero">
          <div className="eyebrow">Organization Calendar</div>
          <h1>Public events from National and Chapters.</h1>
          <p>Browse upcoming and currently active public PSP events. Events disappear automatically after their end date passes.</p>
          <div className="public-archive-toolbar">
            <strong>{events.length} upcoming event{events.length === 1 ? "" : "s"}</strong>
            <Link className="btn btn-primary" href="/">Back to Homepage</Link>
          </div>
        </section>

        <div className="public-archive-grid">
          {events.map((event) => {
            const imageUrl = contentMediaUrl("event", event.id, event.imageUrl);
            return (
              <article className="app-panel public-archive-card" key={event.id}>
                {imageUrl ? <img src={imageUrl} alt="" /> : null}
                <small>
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
