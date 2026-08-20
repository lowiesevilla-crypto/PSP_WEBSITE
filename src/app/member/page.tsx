import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = {
  title: "Member Dashboard",
};

export const dynamic = "force-dynamic";

const actions = [
  ["₱", "Payments", "/member/payments"],
  ["QR", "My Certificate", "/member/certificate"],
  ["EV", "Events", "/member/events"],
  ["◎", "Community", "/member/community"],
];

export default async function MemberDashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!context.user.member) redirect("/admin");

  const now = new Date();
  const member = await prisma.member.findUnique({
    where: { id: context.user.member.id },
    include: {
      chapter: { select: { id: true, code: true, name: true } },
    },
  });
  if (!member) redirect("/login");

  const [announcement, event, certificate] = await Promise.all([
    prisma.announcement.findFirst({
      where: {
        OR: [
          { audience: "NATIONAL" },
          { audience: "CHAPTER", chapterId: member.chapterId },
        ],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      select: { title: true, body: true },
    }),
    prisma.event.findFirst({
      where: {
        isPublished: true,
        startsAt: { gte: now },
        OR: [
          { audience: "NATIONAL" },
          { audience: "CHAPTER", chapterId: member.chapterId },
        ],
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, venue: true },
    }),
    prisma.certificate.findFirst({
      where: { memberId: member.id, status: "VALID" },
      orderBy: { issuedAt: "desc" },
      select: { id: true, certificateNumber: true },
    }),
  ]);

  const initials = [member.firstName[0], member.lastName[0]].filter(Boolean).join("").toUpperCase();

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: ".82rem", color: "#6b665c" }}>{context.user.displayName}</span>
            <div
              aria-label="Member avatar"
              style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: "50%", background: "#fec009", fontWeight: 900 }}
            >
              {initials}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>Member Portal</p>
          <h1>Welcome back, {member.firstName}.</h1>
        </div>

        <div className="app-grid">
          <section>
            <div className="member-card">
              <div className="member-card-top">
                <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
                <span className="member-card-status">{member.membershipStatus} MEMBER</span>
              </div>
              <div className="member-card-name">
                {[member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ")}
              </div>
              <div className="member-card-meta">
                <div>
                  <small>Membership No.</small>
                  <strong>{member.membershipNo}</strong>
                </div>
                <div>
                  <small>Primary Chapter</small>
                  <strong>{member.chapter.name}</strong>
                </div>
              </div>
            </div>

            <div className="quick-actions" aria-label="Quick actions">
              {actions.map(([icon, label, href]) => (
                <Link className="quick-action" href={href} key={label}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            <div className="app-panel" style={{ marginTop: 18 }}>
              <h2>Latest Update</h2>
              {announcement ? (
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 14, background: "#151515", color: "#fec009", fontWeight: 900 }}>
                    Ψ
                  </div>
                  <div>
                    <strong>{announcement.title}</strong>
                    <p style={{ margin: "6px 0 0", color: "#6b665c", lineHeight: 1.55 }}>
                      {announcement.body}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#6b665c" }}>No active announcements at this time.</p>
              )}
            </div>
          </section>

          <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <div className="app-panel">
              <h2>Membership Details</h2>
              <dl style={{ display: "grid", gap: 12, margin: 0 }}>
                <div><dt style={{ color: "#746b5b" }}>PSP Birthday Code</dt><dd style={{ margin: 0, fontWeight: 800 }}>{member.pspBirthdayCode || "—"}</dd></div>
                <div><dt style={{ color: "#746b5b" }}>Date Survive</dt><dd style={{ margin: 0, fontWeight: 800 }}>{member.dateSurvive ? member.dateSurvive.toLocaleDateString("en-PH") : "—"}</dd></div>
                <div><dt style={{ color: "#746b5b" }}>Location</dt><dd style={{ margin: 0, fontWeight: 800 }}>{member.surviveLocation || "—"}</dd></div>
              </dl>
            </div>

            <div className="app-panel">
              <h2>Upcoming Event</h2>
              {event ? (
                <>
                  <strong>{event.title}</strong>
                  <p style={{ color: "#6b665c", lineHeight: 1.55 }}>
                    {event.startsAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}
                    {event.venue ? ` · ${event.venue}` : ""}
                  </p>
                  <Link className="btn" href={`/member/events#${event.id}`} style={{ width: "100%", border: "1px solid #ddd5c1", background: "#fff" }}>View Event</Link>
                </>
              ) : (
                <p style={{ color: "#6b665c" }}>No upcoming published event.</p>
              )}
            </div>

            <div className="app-panel">
              <h2>Membership Certificate</h2>
              {certificate ? (
                <>
                  <p style={{ color: "#6b665c", lineHeight: 1.55 }}>Certificate {certificate.certificateNumber} is valid and available.</p>
                  <Link className="btn" href="/member/certificate" style={{ width: "100%", color: "white", background: "#151515" }}>Open Certificate</Link>
                </>
              ) : (
                <p style={{ color: "#6b665c", lineHeight: 1.55 }}>No active membership certificate has been issued yet.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <nav className="app-bottom-nav" aria-label="Member mobile navigation">
        <Link className="active" href="/member">Home</Link>
        <Link href="/member/community">Community</Link>
        <Link href="/member/events">Events</Link>
        <Link href="/member/payments">Payments</Link>
        <Link href="/member/more">More</Link>
      </nav>
    </main>
  );
}
