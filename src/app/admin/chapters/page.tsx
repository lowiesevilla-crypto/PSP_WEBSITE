import Link from "next/link";
import { ChapterStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  authorizedChapterIds,
  getAuthContext,
  hasPermission,
} from "@/lib/auth/context";
import { chapterLogoPublicPath } from "@/lib/chapter/logo";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ChapterCreateForm } from "@/components/admin/chapter-create-form";
import { ChapterAdminAssignmentForm } from "@/components/admin/chapter-admin-assignment-form";
import { ChapterLogoControl } from "@/components/admin/chapter-logo-control";
import { ChapterStatusControl } from "@/components/admin/chapter-status-control";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const CHAPTER_STATUSES: ChapterStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "ARCHIVED"];

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  page?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ChaptersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const scope = authorizedChapterIds(context, "chapters.view");
  if (scope !== null && scope.length === 0) redirect("/admin");
  const canCreateChapter = hasPermission(context, "chapters.manage", null);

  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedStatus = (single(params.status) ?? "").trim().toUpperCase();
  const requestedPage = parsePage(single(params.page));
  const statusFilter = CHAPTER_STATUSES.includes(requestedStatus as ChapterStatus) ? requestedStatus as ChapterStatus : null;

  const where: Prisma.ChaptersWhereInput = {
    ...(scope === null ? {} : { id: { in: scope } }),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q } },
        { code: { contains: q } },
        { email: { contains: q } },
        { address: { contains: q } },
        { roleAssignments: { some: { endsAt: null, role: { code: "CHAPTER_ADMIN" }, user: { displayName: { contains: q } } } } },
      ],
    } : {}),
  };

  const totalItems = await prisma.chapters.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const chapters = await prisma.chapters.findMany({
    where,
    orderBy: [{ name: "asc" }, { code: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      _count: { select: { members: true, applications: true } },
      roleAssignments: {
        where: {
          endsAt: null,
          role: { code: "CHAPTER_ADMIN" },
        },
        select: {
          user: { select: { id: true, displayName: true, email: true, status: true } },
        },
      },
    },
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Organization</p>
            <h1>Chapter Management</h1>
            <p style={{ marginTop: 8, maxWidth: 780, color: "#746b5b", lineHeight: 1.55 }}>
              Manage Chapter lifecycle, branding and administrators in one searchable register. Chapter financial/payment setup remains independently validated in Finance so an administrative edit cannot accidentally activate online payments.
            </p>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        {canCreateChapter ? <div style={{ marginBottom: 20 }}><ChapterCreateForm /></div> : null}

        <form className="admin-list-toolbar" method="get" action="/admin/chapters">
          <label className="admin-search-field">Search Chapters<input name="q" defaultValue={q} placeholder="Chapter name, code, admin, email or address…" /></label>
          <label>Status<select name="status" defaultValue={statusFilter ?? ""}><option value="">All statuses</option>{CHAPTER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <button className="btn btn-primary" type="submit">Search / Filter</button>
          <Link className="btn" href="/admin/chapters" style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
        </form>

        {chapters.length ? (
          <div className="admin-table-wrap">
            <table className="admin-responsive-table">
              <thead><tr><th>Chapter</th><th>Status</th><th>Members</th><th>Applications</th><th>Chapter Admin</th><th>Management</th></tr></thead>
              <tbody>
                {chapters.map((chapter) => (
                  <tr key={chapter.id}>
                    <td data-label="Chapter">
                      <strong>{chapter.name}</strong>
                      <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{chapter.code}</small>
                      {chapter.email ? <small style={{ display: "block", color: "#746b5b", marginTop: 3, overflowWrap: "anywhere" }}>{chapter.email}</small> : null}
                    </td>
                    <td data-label="Status"><strong>{chapter.status}</strong></td>
                    <td data-label="Members"><strong>{chapter._count.members.toLocaleString("en-PH")}</strong></td>
                    <td data-label="Applications"><strong>{chapter._count.applications.toLocaleString("en-PH")}</strong></td>
                    <td data-label="Chapter Admin">
                      {chapter.roleAssignments.length ? <div style={{ display: "grid", gap: 6 }}>{chapter.roleAssignments.map((assignment) => <span key={assignment.user.id}><strong>{assignment.user.displayName}</strong><small style={{ display: "block", color: "#746b5b", overflowWrap: "anywhere" }}>{assignment.user.email} · {assignment.user.status}</small></span>)}</div> : <span style={{ color: "#746b5b" }}>No Chapter Administrator assigned</span>}
                    </td>
                    <td data-label="Management">
                      <div className="admin-table-actions">
                        {hasPermission(context, "content.manage", chapter.id) ? <ChapterLogoControl chapterId={chapter.id} chapterName={chapter.name} logoUrl={chapterLogoPublicPath(chapter.id, chapter.logoUrl)} /> : null}
                        {hasPermission(context, "chapters.manage", chapter.id) ? <><ChapterStatusControl chapterId={chapter.id} chapterName={chapter.name} status={chapter.status} /><ChapterAdminAssignmentForm chapterId={chapter.id} chapterStatus={chapter.status} /></> : <span style={{ color: "#746b5b" }}>View only</span>}
                        {hasPermission(context, "finance.manage", chapter.id) ? <Link className="btn" href="/admin/finance" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Finance & Payment Setup</Link> : null}
                        {hasPermission(context, "members.manage", chapter.id) ? <Link className="btn" href={`/admin/members?chapter=${encodeURIComponent(chapter.id)}`} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>View Members</Link> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="app-panel"><p style={{ margin: 0 }}>No Chapters match the current search and filters in your authorized scope.</p></div>}

        <AdminPagination pathname="/admin/chapters" page={page} totalPages={totalPages} totalItems={totalItems} query={{ q: q || undefined, status: statusFilter ?? undefined }} />
      </div>
    </main>
  );
}
