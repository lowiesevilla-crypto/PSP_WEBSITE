import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { getAuthContext } from "@/lib/auth/context";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { getChapterPayMongoConfig } from "@/lib/paymongo/chapter-config";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = { title: "Member Dashboard" };
export const dynamic = "force-dynamic";

const actions = [
  ["wallet", "Payments", "/payments", "Settle dues and assessments"],
  ["funds", "Chapter Funds", "/member/chapter-funds", "View collections and expenses"],
  ["megaphone", "General Announcement", "/updates", "Nationwide public updates"],
  ["receipt", "Receipts", "/payments/receipts", "Payment history and proof"],
  ["id", "Digital ID", "/member/id", "Open your PSP member ID"],
  ["award", "Certificates", "/certificate", "Download verified certificates"],
  ["chapter", "My Chapter", "/chapter", "Officers and chapter details"],
  ["calendar", "Events", "/events", "Public and chapter events"],
  ["profile", "Profile", "/profile", "Manage account information"],
  ["install", "Install App", "/install", "Add PSP to your phone"],
] as const;

const adminPermissions = new Set([
  "chapters.manage",
  "chapters.view",
  "applications.view",
  "applications.review",
  "members.view",
  "members.manage",
  "roles.manage",
  "finance.view",
  "finance.manage",
  "content.manage",
  "events.manage",
  "reports.view",
  "audit.view",
  "certificates.manage",
]);

export default async function MemberDashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!context.user.member) redirect("/admin");

  const permissionSet = new Set(context.assignments.flatMap((assignment) => assignment.permissions));
  const hasAdminAccess = Array.from(permissionSet).some((permission) => adminPermissions.has(permission));

  const now = new Date();
  const member = await prisma.member.findUnique({
    where: { id: context.user.member.id },
    include: { chapter: { select: { id: true, code: true, name: true, description: true } } },
  });
  if (!member) redirect("/login");

  const [announcement, event, certificateCount, digitalId, unreadNotifications, ledger, contributions, officers, paymentRuntime] = await Promise.all([
    prisma.announcement.findFirst({
      where: {
        OR: [{ audience: "NATIONAL" }, { audience: "CHAPTER", chapterId: member.chapterId }],
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
        status: "PUBLISHED",
        startsAt: { gte: now },
        OR: [{ audience: "NATIONAL" }, { audience: "CHAPTER", chapterId: member.chapterId }],
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, venue: true },
    }),
    prisma.certificate.count({ where: { memberId: member.id, status: "VALID" } }),
    prisma.digitalMemberId.findUnique({ where: { memberId: member.id }, select: { id: true, status: true } }),
    prisma.notification.count({ where: { userId: context.user.id, readAt: null } }),
    prisma.memberLedgerEntry.findMany({ where: { memberId: member.id }, select: { type: true, amount: true } }),
    prisma.payment.aggregate({
      where: { memberId: member.id, status: "PAID", category: "CONTRIBUTION" },
      _sum: { amount: true },
    }),
    prisma.chapterPosition.findMany({
      where: { chapterId: member.chapterId, isActive: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      take: 4,
      include: {
        assignments: {
          where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          take: 1,
          include: { member: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    getChapterPayMongoConfig(member.chapterId).then(
      (config) => ({ ready: true as const, methods: config.paymentMethods }),
      () => ({ ready: false as const, methods: [] as string[] }),
    ),
  ]);

  const balance = ledger.reduce(
    (total, entry) => total.plus(ledgerSignedAmount(entry)),
    new Prisma.Decimal(0),
  );
  const totalContributions = contributions._sum.amount ?? new Prisma.Decimal(0);
  const initials = [member.firstName[0], member.lastName[0]].filter(Boolean).join("").toUpperCase();
  const paymentMethods = paymentRuntime.ready
    ? paymentRuntime.methods.includes("qrph") ? "QR Ph" : "QR Ph setup required"
    : "Chapter setup required";

  return (
    <main className="app-shell" data-member-dashboard-version="payment-first-v1">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {hasAdminAccess ? (
              <Link href="/admin" aria-label="Open administration dashboard" style={{ fontWeight: 900, color: "#806000", fontSize: ".78rem", textDecoration: "none" }}>
                Admin
              </Link>
            ) : null}
            <Link href="/notifications" aria-label={`${unreadNotifications} unread notifications`} style={{ fontWeight: 900, color: "#151515", textDecoration: "none" }}>
              🔔{unreadNotifications ? ` ${unreadNotifications}` : ""}
            </Link>
            <div aria-label="Member avatar" style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: "50%", background: "#fec009", fontWeight: 900 }}>{initials}</div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div className="app-greeting">
          <p>Member Portal</p>
          <h1>Welcome, {member.firstName}.</h1>
          <p style={{ marginTop: 7, color: "#746b5b" }}>{member.chapter.name} · {member.membershipNo}</p>
        </div>

        <section className="app-panel member-balance-panel" style={{ marginBottom: 16, border: balance.gt(0) ? "1px solid #e5cd77" : "1px solid #c9dfcc", background: balance.gt(0) ? "linear-gradient(135deg,#fff9e9,#fff)" : "linear-gradient(135deg,#f4fbf5,#fff)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(220px,.8fr)", gap: 18, alignItems: "center" }} className="member-payment-hero">
            <div className="member-balance-copy">
              <small>OUTSTANDING BALANCE</small>
              <strong className={balance.gt(0) ? "is-due" : "is-clear"}>{php(balance)}</strong>
              <p>
                {balance.gt(0) ? "Review your dues and assessments, then pay securely when your Chapter online-payment setup is enabled." : "Your current PSP ledger has no outstanding balance."}
              </p>
              <div className="member-balance-chips">
                <span style={chipStyle}>{paymentRuntime.ready ? "Online Payment Ready" : "Online Payment Unavailable"}</span>
                <span style={chipStyle}>{paymentMethods}</span>
              </div>
            </div>
            <div className="member-balance-actions">
              <Link className="btn btn-primary" href="/payments">{balance.gt(0) ? "Pay Now / View Dues" : "View Payments"}</Link>
              <Link className="btn" href="/payments/receipts">Receipts & History</Link>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
          <SummaryCard label="Total Confirmed Contributions" value={php(totalContributions)} href="/payments" />
          <SummaryCard label="Available Certificates" value={certificateCount.toLocaleString("en-PH")} href="/certificate" />
        </section>

        <section className="member-card" style={{ marginBottom: 16 }}>
          <div className="member-card-top">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span className="member-card-status">{member.membershipStatus} MEMBER</span>
          </div>
          <div className="member-card-name">{[member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ")}</div>
          <div className="member-card-meta">
            <div><small>Membership No.</small><strong>{member.membershipNo}</strong></div>
            <div><small>Chapter</small><strong>{member.chapter.name}</strong></div>
          </div>
        </section>

        <section className="quick-actions" aria-label="Member quick actions" style={{ marginBottom: 18 }}>
          {hasAdminAccess ? (
            <Link className="quick-action" href="/admin">
              <span className="quick-action-icon" aria-hidden="true"><ActionIcon name="chapter" /></span>
              <span className="quick-action-copy"><strong>Admin Dashboard</strong><small>Switch to your authorized National or Chapter administration.</small></span>
            </Link>
          ) : null}
          {actions.map(([icon, label, href, description]) => (
            <Link className="quick-action" href={href} key={label}>
              <span className="quick-action-icon" aria-hidden="true"><ActionIcon name={icon} /></span>
              <span className="quick-action-copy"><strong>{label}</strong><small>{description}</small></span>
            </Link>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          <section className="app-panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>My Chapter</h2>
              <Link href="/chapter" style={{ fontWeight: 800 }}>View all</Link>
            </div>
            <h3 style={{ marginBottom: 5 }}>{member.chapter.name}</h3>
            {member.chapter.description ? <p style={{ color: "#6b665c", lineHeight: 1.55 }}>{member.chapter.description}</p> : null}
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {officers.flatMap((position) => position.assignments.map((assignment) => (
                <div key={assignment.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #eee7d8", paddingTop: 9 }}>
                  <span style={{ color: "#6b665c" }}>{position.name}</span>
                  <strong>{assignment.member.firstName} {assignment.member.lastName}</strong>
                </div>
              )))}
              {officers.every((position) => position.assignments.length === 0) ? <p style={{ color: "#6b665c", marginBottom: 0 }}>Officer assignments are available from the Chapter page when published.</p> : null}
            </div>
          </section>

          <section className="app-panel">
            <h2>Digital Membership</h2>
            <div style={{ display: "grid", gap: 11 }}>
              <StatusRow label="Digital Member ID" value={digitalId?.status ?? "READY"} href="/member/id" action="Open ID" />
              <StatusRow label="Certificates" value={certificateCount ? `${certificateCount} AVAILABLE` : "READY"} href="/certificate" action="Open" />
              <StatusRow label="PWA Mobile App" value="INSTALLABLE" href="/install" action="Install" />
              <StatusRow label="Account Security" value="PASSKEY READY" href="/profile#passkeys" action="Manage" />
            </div>
          </section>

          <section className="app-panel">
            <h2>Latest Update</h2>
            {announcement ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 13, background: "#151515", color: "#fec009", fontWeight: 900 }}>Ψ</div>
                <div><strong>{announcement.title}</strong><p style={{ margin: "6px 0 0", color: "#6b665c", lineHeight: 1.55 }}>{announcement.body}</p></div>
              </div>
            ) : <p style={{ color: "#6b665c" }}>No active announcements at this time.</p>}
          </section>

          <section className="app-panel">
            <h2>Upcoming Event</h2>
            {event ? (
              <>
                <strong>{event.title}</strong>
                <p style={{ color: "#6b665c", lineHeight: 1.55 }}>{event.startsAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}{event.venue ? ` · ${event.venue}` : ""}</p>
                <Link className="btn" href={`/events#${event.id}`} style={{ width: "100%", border: "1px solid #ddd5c1", background: "#fff" }}>View Event</Link>
              </>
            ) : <p style={{ color: "#6b665c" }}>No upcoming published event.</p>}
          </section>
        </div>
      </div>

      <nav className="app-bottom-nav" aria-label="Member mobile navigation">
        <Link className="active" href="/member">Home</Link>
        <Link href="/member/id">Digital ID</Link>
        <Link href="/payments">Payments</Link>
        <Link href="/chapter">Chapter</Link>
        <Link href="/profile">More</Link>
      </nav>
    </main>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="app-panel" style={{ padding: 14, textDecoration: "none", color: "inherit" }}>
      <small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 7, fontSize: "1.25rem", color: "#151515" }}>{value}</strong>
    </Link>
  );
}

function StatusRow({ label, value, href, action }: { label: string; value: string; href: string; action: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", paddingTop: 10, borderTop: "1px solid #eee7d8" }}>
      <div><strong style={{ display: "block" }}>{label}</strong><small style={{ color: "#6b665c" }}>{value}</small></div>
      <Link href={href} style={{ fontWeight: 900 }}>{action}</Link>
    </div>
  );
}

const chipStyle: CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 30, padding: "5px 8px", borderRadius: 999, border: "1px solid #ddd5c1", background: "#fff", fontWeight: 800 };

function ActionIcon({ name }: { name: (typeof actions)[number][0] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<(typeof actions)[number][0], ReactNode> = {
    wallet: <><path {...common} d="M4 7.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 17V6a2 2 0 0 1 2-2h12" /><path {...common} d="M16 13h5" /><path {...common} d="M17.5 13.1h.1" /></>,
    funds: <><path {...common} d="M4 18V9" /><path {...common} d="M10 18V5" /><path {...common} d="M16 18v-7" /><path {...common} d="M22 18H2" /><path {...common} d="M6.5 9h-5L4 5.5 6.5 9Z" /><path {...common} d="M12.5 5h-5L10 1.5 12.5 5Z" /><path {...common} d="M18.5 11h-5L16 7.5 18.5 11Z" /></>,
    megaphone: <><path {...common} d="M4 14h3l9 4V6l-9 4H4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2Z" /><path {...common} d="M7 14l1.5 5" /><path {...common} d="M20 9.5a4 4 0 0 1 0 5" /></>,
    receipt: <><path {...common} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path {...common} d="M9 8h6" /><path {...common} d="M9 12h6" /><path {...common} d="M9 16h3" /></>,
    id: <><rect {...common} x="3" y="5" width="18" height="14" rx="3" /><path {...common} d="M8 10h4" /><path {...common} d="M8 14h8" /><circle {...common} cx="16.5" cy="10.5" r="1.8" /></>,
    award: <><circle {...common} cx="12" cy="8" r="4" /><path {...common} d="M8.8 11.2 7 21l5-3 5 3-1.8-9.8" /></>,
    chapter: <><path {...common} d="M3 20h18" /><path {...common} d="M5 20V9l7-5 7 5v11" /><path {...common} d="M9 20v-7h6v7" /></>,
    calendar: <><rect {...common} x="4" y="5" width="16" height="16" rx="3" /><path {...common} d="M8 3v4" /><path {...common} d="M16 3v4" /><path {...common} d="M4 10h16" /><path {...common} d="M8 14h3" /><path {...common} d="M13 14h3" /></>,
    profile: <><circle {...common} cx="12" cy="8" r="4" /><path {...common} d="M4 21a8 8 0 0 1 16 0" /></>,
    install: <><rect {...common} x="6" y="3" width="12" height="18" rx="3" /><path {...common} d="M12 7v7" /><path {...common} d="m9 11 3 3 3-3" /><path {...common} d="M10 18h4" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
