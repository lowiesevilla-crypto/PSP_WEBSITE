import Link from "next/link";
import { Prisma, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { UserStatusControl } from "@/components/admin/user-status-control";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const USER_STATUSES: UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"];

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  chapter?: string | string[];
  page?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!hasPermission(context, "roles.manage", null)) redirect("/admin");

  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedStatus = (single(params.status) ?? "").trim().toUpperCase();
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const pageRequested = parsePage(single(params.page));

  const chapters = await prisma.chapters.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const chapterFilter = chapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const statusFilter = USER_STATUSES.includes(requestedStatus as UserStatus) ? requestedStatus as UserStatus : null;

  const where: Prisma.UserWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(chapterFilter ? {
      OR: [
        { member: { chapterId: chapterFilter } },
        { roleAssignments: { some: { chapterId: chapterFilter, endsAt: null } } },
      ],
    } : {}),
    ...(q ? {
      AND: [{
        OR: [
          { displayName: { contains: q } },
          { email: { contains: q } },
          { member: { membershipNo: { contains: q } } },
          { member: { firstName: { contains: q } } },
          { member: { lastName: { contains: q } } },
          { roleAssignments: { some: { role: { name: { contains: q } } } } },
          { roleAssignments: { some: { role: { code: { contains: q } } } } },
        ],
      }],
    } : {}),
  };

  const totalItems = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ displayName: "asc" }, { email: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      member: {
        select: {
          membershipNo: true,
          membershipStatus: true,
          chapter: { select: { name: true, code: true } },
        },
      },
      roleAssignments: {
        where: { endsAt: null },
        select: {
          role: { select: { code: true, name: true } },
          chapter: { select: { name: true, code: true } },
        },
      },
    },
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div className="app-greeting">
            <p>Access Governance</p>
            <h1>User Management</h1>
            <p style={{ marginTop: 8, maxWidth: 760, color: "#746b5b", lineHeight: 1.55 }}>
              National Administration can search accounts, inspect active role scope and suspend or disable access without deleting membership, finance, certificate or audit history.
            </p>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        <form className="admin-list-toolbar" method="get" action="/admin/users">
          <label className="admin-search-field">Search accounts<input name="q" defaultValue={q} placeholder="Name, email, member no. or role…" /></label>
          <label>Status<select name="status" defaultValue={statusFilter ?? ""}><option value="">All statuses</option>{USER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Chapter<select name="chapter" defaultValue={chapterFilter}><option value="">All Chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}</select></label>
          <button className="btn btn-primary" type="submit">Search / Filter</button>
          <Link className="btn" href="/admin/users" style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
        </form>

        {users.length ? (
          <div className="admin-table-wrap">
            <table className="admin-responsive-table">
              <thead><tr><th>User</th><th>Member / Chapter</th><th>Status</th><th>Active Roles</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="User"><strong>{user.displayName}</strong><small style={{ display: "block", color: "#746b5b", marginTop: 3, overflowWrap: "anywhere" }}>{user.email}</small></td>
                    <td data-label="Member / Chapter">
                      {user.member ? <><strong>{user.member.membershipNo}</strong><small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{user.member.chapter.name} · {user.member.chapter.code} · {user.member.membershipStatus}</small></> : <span style={{ color: "#746b5b" }}>Administrative / non-member account</span>}
                    </td>
                    <td data-label="Status"><strong>{user.status}</strong></td>
                    <td data-label="Active Roles">
                      {user.roleAssignments.length ? <div style={{ display: "grid", gap: 5 }}>{user.roleAssignments.map((assignment, index) => <span key={`${assignment.role.code}-${assignment.chapter?.code ?? "NATIONAL"}-${index}`}><strong>{assignment.role.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{assignment.chapter ? `${assignment.chapter.name} · ${assignment.chapter.code}` : "National"}</small></span>)}</div> : <span style={{ color: "#746b5b" }}>No active role assignment</span>}
                    </td>
                    <td data-label="Actions"><div className="admin-table-actions"><UserStatusControl userId={user.id} displayName={user.displayName} status={user.status} isSelf={user.id === context.user.id} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="app-panel"><p style={{ margin: 0 }}>No accounts match the current search and filters.</p></div>}

        <AdminPagination pathname="/admin/users" page={page} totalPages={totalPages} totalItems={totalItems} query={{ q: q || undefined, status: statusFilter ?? undefined, chapter: chapterFilter || undefined }} />
      </div>
    </main>
  );
}
