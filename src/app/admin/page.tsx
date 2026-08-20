import { ApplicationStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";

export const dynamic = "force-dynamic";

const adminPermissions = new Set([
  "chapters.manage", "applications.view", "applications.review", "members.view", "members.manage",
  "finance.view", "finance.manage", "content.manage", "events.manage", "reports.view", "audit.view", "certificates.manage",
]);
const pendingApplicationStatuses: ApplicationStatus[] = [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.CORRECTION_REQUIRED, ApplicationStatus.PENDING_REQUIREMENTS];

export default async function AdminDashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const permissionSet = new Set(context.assignments.flatMap((assignment) => assignment.permissions));
  const hasAdminAccess = Array.from(permissionSet).some((permission) => adminPermissions.has(permission));
  if (!hasAdminAccess) redirect("/member");

  const chapterScope = authorizedChapterIds(context, "chapters.view");
  const applicationScope = authorizedChapterIds(context, "applications.view");
  const chapterWhere: Prisma.ChaptersWhereInput | undefined = chapterScope === null ? undefined : { id: { in: chapterScope } };
  const applicationWhere: Prisma.MembershipApplicationWhereInput = applicationScope === null
    ? { status: { in: pendingApplicationStatuses } }
    : { chapterId: { in: applicationScope }, status: { in: pendingApplicationStatuses } };

  const [chapterCount, pendingApplications, activeMembers, pendingPayments] = await Promise.all([
    prisma.chapters.count({ where: chapterWhere }),
    prisma.membershipApplication.count({ where: applicationWhere }),
    prisma.member.count({ where: { membershipStatus: "ACTIVE", ...(chapterScope === null ? {} : { chapterId: { in: chapterScope } }) } }),
    permissionSet.has("finance.view")
      ? prisma.payment.count({ where: { status: { in: ["PENDING", "PROCESSING"] }, ...(authorizedChapterIds(context, "finance.view") === null ? {} : { chapterId: { in: authorizedChapterIds(context, "finance.view") ?? [] } }) } })
      : Promise.resolve(0),
  ]);

  const cards: Array<[string, string, string, string]> = [];
  const add = (permission: string, href: string, title: string, description: string) => { if (permissionSet.has(permission)) cards.push([href, title, description, permission]); };
  add("applications.view", "/admin/applications", "Membership Applications", "Review, request corrections, approve, or reject membership applications.");
  add("chapters.view", "/admin/chapters", "Chapter Management", "Maintain chapters, status, profiles, and Chapter Administrator assignments.");
  add("members.view", "/admin/members", "Member Directory", "Search active and historical membership within authorized chapter scope.");
  add("members.manage", "/admin/organization", "Chapter Organization", "Configure positions, officer terms, committees, and committee membership history.");
  add("content.manage", "/admin/announcements", "Announcements", "Publish national or chapter-scoped official updates and pinned notices.");
  add("events.manage", "/admin/events", "Events", "Create, publish, complete, and cancel national or chapter events.");
  add("finance.view", "/admin/finance", "Finance & Reconciliation", "Configure dues, post assessments, review balances, PayMongo transactions, and receipts.");
  add("certificates.manage", "/admin/certificates", "Certificates", "Issue, verify, download, and revoke membership certificates with full history.");
  add("reports.view", "/admin/reports", "Reports", "View membership, application, collections, payment, certificate, and event metrics.");
  add("audit.view", "/admin/audit", "Audit Log", "Review privileged and security-relevant actions within authorized scope.");

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/admin"><img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" /><span>PSP Administration</span></Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><strong style={{ fontSize: ".9rem" }}>{context.user.displayName}</strong><LogoutButton /></div>
        </div>
      </header>
      <div className="container app-main">
        <div className="app-greeting"><p>Administration</p><h1>National & Chapter Operations</h1></div>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 20 }}>
          <Metric label="Accessible Chapters" value={chapterCount} />
          <Metric label="Pending Applications" value={pendingApplications} />
          <Metric label="Active Members" value={activeMembers} />
          {permissionSet.has("finance.view") && <Metric label="Pending Payments" value={pendingPayments} />}
        </section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {cards.map(([href, title, description]) => <AdminCard key={href} href={href} title={title} description={description} />)}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="app-panel"><small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 8, fontSize: "2rem" }}>{value.toLocaleString()}</strong></div>; }
function AdminCard({ href, title, description }: { href: string; title: string; description: string }) { return <Link href={href} className="app-panel" style={{ color: "inherit", textDecoration: "none" }}><h2 style={{ marginTop: 0 }}>{title}</h2><p style={{ color: "#6b665c", lineHeight: 1.6, marginBottom: 0 }}>{description}</p></Link>; }
