import Link from "next/link";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublicUpdate = {
  id: string;
  kind: "Announcement" | "Event";
  title: string;
  body: string | null;
  source: string;
  imageUrl: string | null;
  date: Date;
  meta: string;
  href: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default async function PublicUpdatesPage() {
  const now = new Date();
  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        isPublic: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { chapter: { select: { name: true } } },
      take: 100,
    }),
    prisma.event.findMany({
      where: {
        isPublished: true,
        status: "PUBLISHED",
        OR: [
          { endsAt: null, startsAt: { gte: now } },
          { endsAt: { gt: now } },
        ],
      },
      orderBy: { startsAt: "asc" },
      include: { chapter: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const items: PublicUpdate[] = [
    ...announcements.map((item) => ({
      id: item.id,
      kind: "Announcement" as const,
      title: item.title,
      body: item.body,
      source: item.audience === "NATIONAL" ? "National Office" : item.chapter?.name ?? "Chapter",
      imageUrl: contentMediaUrl("announcement", item.id, item.imageUrl),
      date: item.createdAt,
      meta: item.expiresAt ? `Visible until ${formatDate(item.expiresAt)}` : `Posted ${formatDate(item.createdAt)}`,
      href: `/announcements#${item.id}`,
    })),
    ...events.map((item) => ({
      id: item.id,
      kind: "Event" as const,
      title: item.title,
      body: item.description,
      source: item.audience === "NATIONAL" ? "National Event" : item.chapter?.name ?? "Chapter Event",
      imageUrl: contentMediaUrl("event", item.id, item.imageUrl),
      date: item.startsAt,
      meta: `${formatDate(item.startsAt)}${item.venue ? ` · ${item.venue}` : ""}`,
      href: `/events#${item.id}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" href="/" aria-label="Psi Sigma Phi Philippines Inc. home">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc. seal" />
            <span className="brand-copy"><small>Ψ Σ Φ</small><span>Psi Sigma Phi Philippines Inc.</span></span>
          </Link>
          <div className="nav-actions"><Link className="btn btn-secondary" href="/member">Member Login</Link><Link className="btn btn-primary" href="/register">Register</Link></div>
        </div>
      </header>

      <div className="container app-main">
        <section className="public-archive-hero" data-public-general-updates-version="combined-v1">
          <div className="eyebrow">General Announcement</div>
          <h1>Nationwide PSP announcements and events.</h1>
          <p>Public updates from National and Chapter administrators appear here in one place. Expired announcements and completed events are automatically hidden.</p>
          <div className="public-archive-toolbar">
            <strong>{items.length} active public update{items.length === 1 ? "" : "s"}</strong>
            <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn btn-secondary" href="/announcements">Announcements</Link>
              <Link className="btn btn-secondary" href="/events">Events</Link>
              <Link className="btn btn-primary" href="/">Back to Homepage</Link>
            </span>
          </div>
        </section>

        <section className="public-archive-grid">
          {items.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No active public announcements or events.</p></div> : items.map((item) => (
            <article id={item.id} key={`${item.kind}-${item.id}`} className="app-panel public-archive-card">
              {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
              <small>{item.kind} · {item.source}</small>
              <h2 style={{ margin: 0, overflowWrap: "anywhere" }}>{item.title}</h2>
              {item.body ? <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#575249", overflowWrap: "anywhere" }}>{item.body}</p> : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", borderTop: "1px solid #eee7d8", paddingTop: 12 }}>
                <small style={{ color: "#746b5b" }}>{item.meta}</small>
                <Link className="btn btn-secondary" href={item.href}>Open {item.kind}</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
