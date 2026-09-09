import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getAuthContext } from "@/lib/auth/context";
import { ledgerSignedAmount, php } from "@/lib/finance/ledger";
import { getChapterPayMongoConfig } from "@/lib/paymongo/chapter-config";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = { title: "Member Dashboard" };
export const dynamic = "force-dynamic";

const actions = [
  ["₱", "Payments", "/payments"],
  ["RC", "Receipts", "/payments/receipts"],
  ["ID", "Digital ID", "/member/id"],
  ["QR", "Certificates", "/certificate"],
  ["CH", "My Chapter", "/chapter"],
  ["EV", "Events", "/events"],
  ["PF", "Profile", "/profile"],
  ["APP", "Install App", "/install"],
] as const;

export default async function MemberDashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!context.user.member) redirect("/admin");

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

        <section className="app-panel" style={{ marginBottom: 16, padding: 18, border: balance.gt(0) ? "1px solid #e5cd77" : "1px solid #c9dfcc", background: balance.gt(0) ? "linear-gradient(135deg,#fff9e9,#fff)" : "linear-gradient(135deg,#f4fbf5,#fff)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(220px,.8fr)", gap: 18, alignItems: "center" }} className="member-payment-hero">
            <div>
              <small style={{ color: "#746b5b", fontWeight: 900 }}>OUTSTANDING BALANCE</small>
              <strong style={{ display: "block", marginTop: 4, fontSize: "clamp(2rem,7vw,3.1rem)", lineHeight: 1, letterSpacing: "-.04em", color: balance.gt(0) ? "#8a6500" : "#245b2a" }}>{php(balance)}</strong>
              <p style={{ color: "#665b47", lineHeight: 1.5, margin: "10px 0 0" }}>
                {balance.gt(0) ? "Review your dues and assessments, then pay securely when your Chapter online-payment setup is enabled." : "Your current PSP ledger has no outstanding balance."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11, color: "#6b665c", fontSize: ".82rem" }}>
                <span style={chipStyle}>{paymentRuntime.ready ? "Online Payment Ready" : "Online Payment Unavailable"}</span>
                <span style={chipStyle}>{paymentMethods}</span>
              </div>
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              <Link className="btn btn-primary" href="/payments" style={{ minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{balance.gt(0) ? "Pay Now / View Dues" : "View Payments"}</Link>
              <Link className="btn" href="/payments/receipts" style={{ minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #ddd5c1", background: "#fff" }}>Receipts & History</Link>
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
          {actions.map(([icon, label, href]) => (
            <Link className="quick-action" href={href} key={label}>
              <span>{icon}</span><span>{label}</span>
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

const chipStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 30, padding: "5px 8px", borderRadius: 999, border: "1px solid #ddd5c1", background: "#fff", fontWeight: 800 };
