import Image from "next/image";
import Link from "next/link";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const features = [
  { icon: "ID", title: "Digital Membership", description: "Secure member records, chapter affiliation, membership status, and a premium digital member experience." },
  { icon: "Ψ", title: "Multi-Chapter Management", description: "National administration with strict chapter-scoped membership, officers, content, events, and reporting." },
  { icon: "₱", title: "Dues & PayMongo", description: "Configurable chapter dues, member ledgers, secure online payment, digital receipts, and reconciliation." },
  { icon: "QR", title: "Verified Certificates", description: "Downloadable certificates with unique certificate numbers and live QR verification." },
  { icon: "◎", title: "Community", description: "Chapter and national posts, images, comments, official announcements, and moderated engagement." },
  { icon: "EV", title: "Events & Organization", description: "National and chapter events plus configurable officer positions, committees, and historical terms." },
];

function publicDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(value);
}

function excerpt(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function sourceLabel(item: { audience: string; chapter: { name: string; code?: string | null } | null }) {
  return item.audience === "NATIONAL" || !item.chapter ? "National Office" : `${item.chapter.name}${item.chapter.code ? ` · ${item.chapter.code}` : ""}`;
}

function expiresLabel(value: Date | null | undefined) {
  return value ? `Visible until ${publicDate(value)}` : "No expiration set";
}

async function loadPublicFeed() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      isPublic: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      title: true,
      body: true,
      audience: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true,
      imageUrl: true,
      chapter: { select: { name: true, code: true } },
    },
  }).catch((error) => {
    console.error("Public announcement feed unavailable", error instanceof Error ? error.name : "UnknownError");
    return [];
  });
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
    take: 8,
    select: {
      id: true,
      title: true,
      description: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      audience: true,
      imageUrl: true,
      chapter: { select: { name: true, code: true } },
    },
  }).catch((error) => {
    console.error("Public event feed unavailable", error instanceof Error ? error.name : "UnknownError");
    return [];
  });
  return { announcements, events };
}

export default async function HomePage() {
  const { announcements, events } = await loadPublicFeed();
  const spotlightItems = [
    ...announcements.map((item) => ({
      id: item.id,
      kind: "Announcement",
      title: item.title,
      body: item.body,
      date: item.startsAt ?? item.createdAt,
      meta: expiresLabel(item.expiresAt),
      href: "/announcements",
      source: sourceLabel(item),
      imageUrl: contentMediaUrl("announcement", item.id, item.imageUrl),
    })),
    ...events.map((item) => ({
      id: item.id,
      kind: "Event",
      title: item.title,
      body: item.description,
      date: item.startsAt,
      meta: item.venue ? `${publicDate(item.startsAt)} · ${item.venue}` : publicDate(item.startsAt),
      href: "/events",
      source: sourceLabel(item),
      imageUrl: contentMediaUrl("event", item.id, item.imageUrl),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

  return (
    <main className="site-shell" data-public-chapter-feed-version="global-chapter-feed-v2">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" href="/" aria-label="Psi Sigma Phi Philippines Inc. home">
            <Image src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc. seal" width={52} height={52} />
            <span className="brand-copy"><small>Ψ Σ Φ</small><span>Psi Sigma Phi Philippines Inc.</span></span>
          </Link>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#platform">Platform</a><a href="#updates">Updates</a><a href="#chapters">Chapters</a><a href="#membership">Membership</a><a href="#events">Events</a>
          </nav>
          <div className="nav-actions"><Link className="btn btn-secondary" href="/member">Member Login</Link><Link className="btn btn-primary" href="/register">Register</Link></div>
        </div>
      </header>

      <section className="updates-spotlight" id="updates" data-public-feed-design-version="homepage-cards-v1" data-public-feed-spotlight-version="nationwide-expiring-v1">
        <div className="container updates-shell">
          <div className="updates-lead">
            <div className="eyebrow">Public PSP Updates</div>
            <h1>Official announcements and events, visible nationwide.</h1>
            <p>Public posts from National and Chapter administrators appear here automatically, then disappear when their expiration or event end date passes.</p>
            <div className="updates-actions">
              <Link className="btn btn-primary" href="/updates">View All Updates</Link>
              <Link className="btn btn-primary" href="/announcements">View Announcements</Link>
              <Link className="btn btn-secondary" href="/events">View Events</Link>
            </div>
          </div>
          <div className="updates-board" aria-label="Latest public announcements and events">
            <div className="updates-stats">
              <span><strong>{announcements.length}</strong> active public announcements</span>
              <span><strong>{events.length}</strong> upcoming public events</span>
            </div>
            {spotlightItems.length ? (
              <div className="updates-card-grid">
                {spotlightItems.map((item) => (
                  <Link href={item.href} className="updates-card" key={`${item.kind}-${item.id}`}>
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="updates-card-image" /> : <div className="updates-card-mark" aria-hidden="true">{item.kind === "Event" ? "EV" : "PSP"}</div>}
                    <small>{item.kind} · {item.source}</small>
                    <h2>{item.title}</h2>
                    <p>{excerpt(item.body, 145)}</p>
                    <span>{item.meta}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="updates-empty">
                <h2>No current public updates</h2>
                <p>Published public announcements and events from National or Chapter admins will show here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Official Digital Membership Platform</div>
            <h1>One brotherhood. <span>Every chapter connected.</span></h1>
            <p>A premium, mobile-first Psi Sigma Phi ecosystem for membership, chapter organization, community updates, events, online dues, digital receipts, and QR-verifiable certificates.</p>
            <div className="hero-actions"><Link className="btn btn-primary" href="/register">Start Membership Registration</Link><Link className="btn btn-secondary" href="/member">Open Member PWA</Link></div>
            <div className="trust-row" aria-label="Platform highlights"><span>Installable PWA</span><span>Chapter Scoped</span><span>PayMongo Platforms</span><span>QR Verified</span></div>
          </div>
          <div className="hero-visual" aria-label="Psi Sigma Phi official seal">
            <div className="hero-orbit" aria-hidden="true" />
            <div className="seal-card"><Image src="/brand/psp-logo.jpg" alt="Official Psi Sigma Phi Philippines Inc. seal" width={430} height={430} priority /></div>
            <div className="platform-chip"><strong>National → Chapter → Member</strong><span>One secure platform with chapter-specific organization and finance.</span></div>
          </div>
        </div>
      </section>

      <section className="public-feed-band" id="public-updates-list">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="eyebrow">Public PSP Updates</div>
              <h2>Announcements & Events</h2>
            </div>
            <p>When National or Chapter admins tag an announcement as public, or publish an event, it appears here on the PSP website landing page.</p>
          </div>
          <div className="public-feed-grid">
            <article className="public-feed-panel">
              <div className="public-feed-panel-head">
                <small>Announcements</small>
                <Link href="/announcements">View all</Link>
              </div>
              {announcements.length ? announcements.slice(0, 3).map((announcement) => (
                <div className="public-feed-card" key={announcement.id}>
                  <small>{sourceLabel(announcement)}</small>
                  {announcement.imageUrl ? <img src={contentMediaUrl("announcement", announcement.id, announcement.imageUrl) ?? ""} alt="" className="public-feed-card-image" /> : null}
                  <h3>{announcement.title}</h3>
                  <p>{excerpt(announcement.body, 150)}</p>
                  <span>{publicDate(announcement.startsAt ?? announcement.createdAt)} · {expiresLabel(announcement.expiresAt)}</span>
                </div>
              )) : <p className="public-feed-empty">No public announcements yet.</p>}
            </article>
            <article className="public-feed-panel">
              <div className="public-feed-panel-head">
                <small>Events</small>
                <Link href="/events">View all</Link>
              </div>
              {events.length ? events.slice(0, 3).map((event) => (
                <div className="public-feed-card" key={event.id}>
                  <small>{sourceLabel(event)}</small>
                  {event.imageUrl ? <img src={contentMediaUrl("event", event.id, event.imageUrl) ?? ""} alt="" className="public-feed-card-image" /> : null}
                  <h3>{event.title}</h3>
                  <p>{excerpt(event.description, 150)}</p>
                  <span>{publicDate(event.startsAt)}{event.venue ? ` · ${event.venue}` : ""}</span>
                </div>
              )) : <p className="public-feed-empty">No published events yet.</p>}
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <div className="section-header"><h2>Built for the full Ψ Σ Φ ecosystem.</h2><p>The digital platform combines the official website, installable Member PWA, Chapter Admin Portal, and National/System Admin Portal in one architecture.</p></div>
          <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.title}><div className="feature-icon" aria-hidden="true">{feature.icon}</div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
        </div>
      </section>

      <section className="section" id="announcements">
        <div className="container">
          <div className="section-header"><div><div className="eyebrow">Across Psi Sigma Phi Philippines Inc.</div><h2>Latest National & Chapter Updates</h2></div><p>Announcements appear here only when an authorized administrator explicitly marks them for the public PSP website.</p></div>
          {announcements.length ? (
            <div className="feature-grid">{announcements.map((announcement) => <article className="feature-card" key={announcement.id}><small style={{ color: "#7b6630", fontWeight: 900 }}>{announcement.chapter ? `${announcement.chapter.name} · ${announcement.chapter.code}` : "National"}</small><h3>{announcement.title}</h3><p>{excerpt(announcement.body)}</p><small style={{ color: "#716a5f" }}>{publicDate(announcement.startsAt ?? announcement.createdAt)}</small></article>)}</div>
          ) : <div className="feature-card"><h3>No current public announcements</h3><p>New National and Chapter announcements will appear here only when specifically published for public viewing.</p></div>}
        </div>
      </section>

      <section className="section" id="events">
        <div className="container">
          <div className="section-header"><div><div className="eyebrow">Organization Calendar</div><h2>Published National & Chapter Events</h2></div><p>Upcoming and recently published events from every Chapter are presented in one clear public view.</p></div>
          {events.length ? (
            <div className="feature-grid">{events.map((event) => <article className="feature-card" key={event.id}><small style={{ color: "#7b6630", fontWeight: 900 }}>{event.chapter ? `${event.chapter.name} · ${event.chapter.code}` : "National"}</small><h3>{event.title}</h3><p>{excerpt(event.description)}</p><div style={{ display: "grid", gap: 4, color: "#615847", fontSize: ".86rem" }}><strong>{publicDate(event.startsAt)}{event.endsAt ? ` – ${publicDate(event.endsAt)}` : ""}</strong>{event.venue ? <span>{event.venue}</span> : null}</div></article>)}</div>
          ) : <div className="feature-card"><h3>No published events yet</h3><p>Published National and Chapter events will appear here automatically.</p></div>}
        </div>
      </section>

      <section className="section" id="membership">
        <div className="container">
          <div className="section-header"><h2>Designed mobile-first for every member.</h2><p>Core membership workflows are designed to work completely from a phone, while Chapter and National administration adapt cleanly to tablet and desktop.</p></div>
          <div className="member-preview">
            <div className="member-card"><div className="member-card-top"><Image src="/brand/psp-logo.jpg" alt="Official Psi Sigma Phi seal" width={54} height={54} /><span className="member-card-status">ACTIVE MEMBER</span></div><div className="member-card-name">Juan Dela Cruz</div><div className="member-card-meta"><div><small>Member No.</small><strong>PSP-2026-000001</strong></div><div><small>Chapter</small><strong>Rho Alpha De Las Piñas</strong></div></div></div>
            <div className="member-dashboard"><div className="metric-card gold"><small>Outstanding Dues</small><strong>₱500.00</strong></div><div className="metric-card"><small>Next Event</small><strong>Chapter Assembly</strong></div><div className="metric-card"><small>Certificate</small><strong>Available</strong></div><div className="metric-card"><small>Community</small><strong>12 New Updates</strong></div></div>
          </div>
        </div>
      </section>

      <section className="section" id="chapters"><div className="container section-header"><h2>Independent Chapters. One National platform.</h2><p>Each Chapter maintains its own officers, organization structure, member list, contribution rates, events, announcements, and financial reporting without exposing restricted Chapter information to other Chapters.</p></div></section>

      <footer className="footer"><div className="container footer-row"><div>© 2026 Psi Sigma Phi Philippines Inc.</div><div>Ψ Σ Φ Digital Membership Platform</div></div></footer>
    </main>
  );
}
