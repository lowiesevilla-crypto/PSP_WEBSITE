import Link from "next/link";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
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
    include: { chapter: { select: { name: true } } },
    take: 100,
  });

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
        <section className="public-archive-hero">
          <div className="eyebrow">Official Updates</div>
          <h1>Public announcements from National and Chapters.</h1>
          <p>Browse active public announcements posted by authorized PSP administrators. Items disappear automatically after their expiration date.</p>
          <div className="public-archive-toolbar">
            <strong>{announcements.length} active announcement{announcements.length === 1 ? "" : "s"}</strong>
            <Link className="btn btn-primary" href="/">Back to Homepage</Link>
          </div>
        </section>
        <section className="public-archive-grid">
          {announcements.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No active public announcements.</p></div> : announcements.map((item) => {
            const imageUrl = contentMediaUrl("announcement", item.id, item.imageUrl);
            return (
              <article id={item.id} key={item.id} className="app-panel public-archive-card">
                {imageUrl ? <img src={imageUrl} alt="" /> : null}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {item.isPinned && <small>PINNED</small>}
                  <small>{item.audience === "NATIONAL" ? "National Office" : item.chapter?.name ?? "Chapter"}</small>
                </div>
                <h2 style={{ overflowWrap: "anywhere" }}>{item.title}</h2>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#575249", overflowWrap: "anywhere" }}>{item.body}</p>
                <small style={{ color: "#746b5b" }}>{item.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}</small>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
