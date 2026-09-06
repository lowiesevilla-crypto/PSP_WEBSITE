import Link from "next/link";
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

async function loadPublicFeed() {
  const now = new Date();
  try {
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
        take: 8,
        select: {
          id: true,
          title: true,
          body: true,
          audience: true,
          startsAt: true,
          createdAt: true,
          chapter: { select: { name: true, code: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          isPublished: true,
          status: "PUBLISHED",
          startsAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
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
          chapter: { select: { name: true, code: true } },
        },
      }),
    ]);
    return { announcements, events };
  } catch (error) {
    console.error("Public chapter feed unavailable", error instanceof Error ? error.name : "UnknownError");
    return { announcements: [], events: [] };
  }
}

export default async function HomePage() {
  const { announcements, events } = await loadPublicFeed();

  return (
    <main className="site-shell" data-public-chapter-feed-version="global-chapter-feed-v1">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" href="/" aria-label="Psi Sigma Phi Philippines Inc. home">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc. seal" />
            <span className="brand-copy"><small>Ψ Σ Φ</small><span>Psi Sigma Phi Philippines Inc.</span></span>
          </Link>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#platform">Platform</a><a href="#updates">Updates</a><a href="#chapters">Chapters</a><a href="#membership">Membership</a><a href="#events">Events</a>
          </nav>
          <div className="nav-actions"><Link className="btn btn-secondary" href="/member">Member Login</Link><Link className="btn btn-primary" href="/register">Register</Link></div>
        </div>
      </header>

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
            <div className="seal-card"><img src="/brand/psp-logo.jpg" alt="Official Psi Sigma Phi Philippines Inc. seal" /></div>
            <div className="platform-chip"><strong>National → Chapter → Member</strong><span>One secure platform with chapter-specific organization and finance.</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <div className="section-header"><h2>Built for the full Ψ Σ Φ ecosystem.</h2><p>The digital platform combines the official website, installable Member PWA, Chapter Admin Portal, and National/System Admin Portal in one architecture.</p></div>
          <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.title}><div className="feature-icon" aria-hidden="true">{feature.icon}</div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
        </div>
      </section>

      <section className="section" id="updates">
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
            <div className="member-card"><div className="member-card-top"><img src="/brand/psp-logo.jpg" alt="Official Psi Sigma Phi seal" /><span className="member-card-status">ACTIVE MEMBER</span></div><div className="member-card-name">Juan Dela Cruz</div><div className="member-card-meta"><div><small>Member No.</small><strong>PSP-2026-000001</strong></div><div><small>Chapter</small><strong>Rho Alpha De Las Piñas</strong></div></div></div>
            <div className="member-dashboard"><div className="metric-card gold"><small>Outstanding Dues</small><strong>₱500.00</strong></div><div className="metric-card"><small>Next Event</small><strong>Chapter Assembly</strong></div><div className="metric-card"><small>Certificate</small><strong>Available</strong></div><div className="metric-card"><small>Community</small><strong>12 New Updates</strong></div></div>
          </div>
        </div>
      </section>

      <section className="section" id="chapters"><div className="container section-header"><h2>Independent Chapters. One National platform.</h2><p>Each Chapter maintains its own officers, organization structure, member list, contribution rates, events, announcements, and financial reporting without exposing restricted Chapter information to other Chapters.</p></div></section>

      <footer className="footer"><div className="container footer-row"><div>© 2026 Psi Sigma Phi Philippines Inc.</div><div>Ψ Σ Φ Digital Membership Platform</div></div></footer>
    </main>
  );
}
