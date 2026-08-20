import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";

export const dynamic = "force-dynamic";

const adminPermissions = new Set([
  "chapters.manage",
  "applications.view",
  "applications.review",
  "members.view",
  "members.manage",
  "finance.view",
  "finance.manage",
  "content.manage",
  "events.manage",
  "reports.view",
]);

export default async function AdminDashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const hasAdminAccess = context.assignments.some((assignment) =>
    assignment.permissions.some((permission) => adminPermissions.has(permission)),
  );
  if (!hasAdminAccess) redirect("/member");

  const chapterScope = authorizedChapterIds(context, "chapters.view");
  const applicationScope = authorizedChapterIds(context, "applications.view");

  const chapterWhere = chapterScope === null
    ? undefined
    : { id: { in: chapterScope } };
  const applicationWhere = applicationScope === null
    ? { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "PENDING_REQUIREMENTS"] as const } }
    : {
        chapterId: { in: applicationScope },
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "PENDING_REQUIREMENTS"] as const },
      };

  const [chapterCount, pendingApplications, activeMembers] = await Promise.all([
    prisma.chapters.count({ where: chapterWhere }),
    prisma.membershipApplication.count({ where: applicationWhere }),
    prisma.member.count({
      where: {
        membershipStatus: "ACTIVE",
        ...(chapterScope === null ? {} : { chapterId: { in: chapterScope } }),
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/admin">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Administration</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <strong style={{ fontSize: ".9rem" }}>{context.user.displayName}</strong>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>Administration</p>
          <h1>National & Chapter Operations</h1>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Metric label="Accessible Chapters" value={chapterCount} />
          <Metric label="Pending Applications" value={pendingApplications} />
          <Metric label="Active Members" value={activeMembers} />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
          }}
        >
          <AdminCard href="/admin/applications" title="Membership Applications" description="Review, request corrections, approve, or reject chapter applications." />
          <AdminCard href="/admin/chapters" title="Chapter Management" description="View authorized chapters. National System Admin can create and maintain chapters and assign Chapter Admins." />
          <AdminCard href="/admin/members" title="Member Directory" description="Search active and historical membership within your authorized chapter scope." />
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-panel">
      <small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 8, fontSize: "2rem" }}>{value.toLocaleString()}</strong>
    </div>
  );
}

function AdminCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="app-panel" style={{ color: "inherit", textDecoration: "none" }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ color: "#6b665c", lineHeight: 1.6, marginBottom: 0 }}>{description}</p>
    </Link>
  );
}
