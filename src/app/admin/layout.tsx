import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const adminPermissions = new Set([
  "chapters.manage",
  "chapters.view",
  "applications.view",
  "applications.review",
  "members.view",
  "members.manage",
  "finance.view",
  "finance.manage",
  "content.manage",
  "events.manage",
  "reports.view",
  "audit.view",
  "certificates.manage",
]);

const navigation = [
  { href: "/admin", label: "Dashboard", permission: null },
  { href: "/admin/applications", label: "Applications", permission: "applications.view" },
  { href: "/admin/chapters", label: "Chapters", permission: "chapters.view" },
  { href: "/admin/members", label: "Members", permission: "members.view" },
  { href: "/admin/organization", label: "Organization", permission: "members.manage" },
  { href: "/admin/announcements", label: "Announcements", permission: "content.manage" },
  { href: "/admin/events", label: "Events", permission: "events.manage" },
  { href: "/admin/finance", label: "Finance", permission: "finance.view" },
  { href: "/admin/certificates", label: "Certificates", permission: "certificates.manage" },
  { href: "/admin/reports", label: "Reports", permission: "reports.view" },
  { href: "/admin/audit", label: "Audit", permission: "audit.view" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const permissionSet = new Set(context.assignments.flatMap((assignment) => assignment.permissions));
  const hasAdminAccess = Array.from(permissionSet).some((permission) => adminPermissions.has(permission));
  if (!hasAdminAccess) redirect("/member");

  const nationalScope = context.assignments.some(
    (assignment) =>
      assignment.chapterId === null &&
      assignment.permissions.some((permission) => adminPermissions.has(permission)),
  );
  const chapterIds = Array.from(
    new Set(context.assignments.map((assignment) => assignment.chapterId).filter((id): id is string => Boolean(id))),
  );
  const scopedChapters = nationalScope || chapterIds.length === 0
    ? []
    : await prisma.chapters.findMany({
        where: { id: { in: chapterIds } },
        orderBy: { name: "asc" },
        select: { code: true, name: true },
      });

  const scopeLabel = nationalScope
    ? "National scope"
    : scopedChapters.length === 1
      ? `${scopedChapters[0].name} · ${scopedChapters[0].code}`
      : scopedChapters.length > 1
        ? `${scopedChapters.length} chapter scope`
        : "Chapter scope";
  const roleLabel = nationalScope ? "National Administration" : "Chapter Administration";
  const visibleNavigation = navigation.filter(
    (item) => item.permission === null || permissionSet.has(item.permission),
  );

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="container admin-topbar-inner">
          <Link className="admin-brand" href="/admin" aria-label="PSP Administration dashboard">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span className="admin-brand-copy">
              <strong>PSP Administration</strong>
              <small>{roleLabel}</small>
            </span>
          </Link>

          <nav className="admin-nav-links" aria-label="Administration navigation">
            {visibleNavigation.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </nav>

          <div className="admin-account">
            <div className="admin-scope" title={scopeLabel}>
              <span className="admin-scope-dot" aria-hidden="true" />
              <span>{scopeLabel}</span>
            </div>
            <span className="admin-user-name">{context.user.displayName}</span>
            <LogoutButton />
          </div>

          <details className="admin-mobile-menu">
            <summary aria-label="Open administration menu">Menu</summary>
            <div className="admin-mobile-menu-panel">
              <div className="admin-mobile-context">
                <strong>{roleLabel}</strong>
                <span>{scopeLabel}</span>
              </div>
              <nav aria-label="Mobile administration navigation">
                {visibleNavigation.map((item) => (
                  <Link key={item.href} href={item.href}>{item.label}</Link>
                ))}
              </nav>
              <div className="admin-mobile-account">
                <span>{context.user.displayName}</span>
                <LogoutButton />
              </div>
            </div>
          </details>
        </div>
      </header>
      <div className="admin-page-frame">{children}</div>
    </div>
  );
}
