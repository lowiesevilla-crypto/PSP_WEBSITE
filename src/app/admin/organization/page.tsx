import Link from "next/link";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrganizationManager } from "@/components/admin/organization-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type HistoryType = "officers" | "committees";
type SearchParams = Promise<{
  q?: string | string[];
  chapter?: string | string[];
  history?: string | string[];
  page?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminOrganizationPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const memberManage = authorizedChapterIds(context, "members.manage");
  const chapterManage = authorizedChapterIds(context, "chapters.manage");
  const national = memberManage === null || chapterManage === null;
  const scope = national ? null : Array.from(new Set([...(memberManage ?? []), ...(chapterManage ?? [])]));
  if (scope !== null && scope.length === 0) redirect("/admin");

  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const history: HistoryType = single(params.history) === "committees" ? "committees" : "officers";
  const requestedPage = parsePage(single(params.page));

  const chapters = await prisma.chapters.findMany({
    where: scope === null ? { status: "ACTIVE" } : { id: { in: scope }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const ids = chapters.map((chapter) => chapter.id);
  const chapterFilter = chapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const historyChapterIds = chapterFilter ? [chapterFilter] : ids;

  const [members, positions, committees] = await Promise.all([
    prisma.member.findMany({
      where: { chapterId: { in: ids }, membershipStatus: "ACTIVE" },
      orderBy: [{ chapterId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, chapterId: true, membershipNo: true, firstName: true, lastName: true },
    }),
    prisma.chapterPosition.findMany({
      where: { chapterId: { in: ids }, isActive: true },
      orderBy: [{ chapterId: "asc" }, { level: "asc" }, { name: "asc" }],
      select: { id: true, chapterId: true, name: true, code: true, level: true },
    }),
    prisma.committee.findMany({
      where: { chapterId: { in: ids }, isActive: true },
      orderBy: [{ chapterId: "asc" }, { name: "asc" }],
      select: { id: true, chapterId: true, name: true, code: true },
    }),
  ]);

  const officerWhere: Prisma.OfficerAssignmentWhereInput = {
    position: { chapterId: { in: historyChapterIds } },
    ...(q ? {
      OR: [
        { position: { name: { contains: q } } },
        { position: { code: { contains: q } } },
        { member: { membershipNo: { contains: q } } },
        { member: { firstName: { contains: q } } },
        { member: { lastName: { contains: q } } },
        { position: { chapter: { name: { contains: q } } } },
      ],
    } : {}),
  };
  const committeeWhere: Prisma.CommitteeMembershipWhereInput = {
    committee: { chapterId: { in: historyChapterIds } },
    ...(q ? {
      OR: [
        { committee: { name: { contains: q } } },
        { committee: { code: { contains: q } } },
        { roleLabel: { contains: q } },
        { member: { membershipNo: { contains: q } } },
        { member: { firstName: { contains: q } } },
        { member: { lastName: { contains: q } } },
        { committee: { chapter: { name: { contains: q } } } },
      ],
    } : {}),
  };

  const totalItems = history === "officers"
    ? await prisma.officerAssignment.count({ where: officerWhere })
    : await prisma.committeeMembership.count({ where: committeeWhere });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const officerAssignments = history === "officers" ? await prisma.officerAssignment.findMany({
    where: officerWhere,
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      member: { select: { membershipNo: true, firstName: true, lastName: true } },
      position: { select: { name: true, code: true, chapter: { select: { name: true, code: true } } } },
    },
  }) : [];
  const committeeMemberships = history === "committees" ? await prisma.committeeMembership.findMany({
    where: committeeWhere,
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      member: { select: { membershipNo: true, firstName: true, lastName: true } },
      committee: { select: { name: true, code: true, chapter: { select: { name: true, code: true } } } },
    },
  }) : [];

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Governance</p>
            <h1>Chapter Organization</h1>
            <p style={{ marginTop: 8, maxWidth: 780, color: "#746b5b", lineHeight: 1.55 }}>
              Configure positions, officers, committees and committee membership within authorized Chapter scope, then search the complete historical assignment register without fixed record truncation.
            </p>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        <OrganizationManager chapters={chapters.map(({ id, name }) => ({ id, name }))} members={members} positions={positions.map((position) => ({ id: position.id, chapterId: position.chapterId, name: position.name }))} committees={committees.map((committee) => ({ id: committee.id, chapterId: committee.chapterId, name: committee.name }))} />

        <section className="app-panel" style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <small style={{ color: "#806500", fontWeight: 900 }}>ORGANIZATION REGISTER</small>
            <h2 style={{ margin: "5px 0 0" }}>{history === "officers" ? "Officer Assignment History" : "Committee Membership History"}</h2>
          </div>

          <form className="admin-list-toolbar" method="get" action="/admin/organization">
            <label className="admin-search-field">Search history<input name="q" defaultValue={q} placeholder="Member, position, committee, role or Chapter…" /></label>
            <label>Chapter<select name="chapter" defaultValue={chapterFilter}><option value="">All authorized Chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}</select></label>
            <label>Register<select name="history" defaultValue={history}><option value="officers">Officers</option><option value="committees">Committees</option></select></label>
            <button className="btn btn-primary" type="submit">Search / Filter</button>
            <Link className="btn" href="/admin/organization" style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
          </form>

          {history === "officers" ? (
            officerAssignments.length ? <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Position</th><th>Member</th><th>Chapter</th><th>Term Start</th><th>Term End</th><th>Status</th></tr></thead><tbody>{officerAssignments.map((item) => <tr key={item.id}><td data-label="Position"><strong>{item.position.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.position.code}</small></td><td data-label="Member"><strong>{item.member.firstName} {item.member.lastName}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.member.membershipNo}</small></td><td data-label="Chapter"><strong>{item.position.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.position.chapter.code}</small></td><td data-label="Term Start">{item.startsAt.toLocaleDateString("en-PH")}</td><td data-label="Term End">{item.endsAt ? item.endsAt.toLocaleDateString("en-PH") : "—"}</td><td data-label="Status"><strong>{!item.endsAt || item.endsAt > new Date() ? "CURRENT" : "ENDED"}</strong></td></tr>)}</tbody></table></div> : <p style={{ color: "#6b665c" }}>No officer assignments match the current search and filters.</p>
          ) : (
            committeeMemberships.length ? <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Committee</th><th>Member</th><th>Chapter</th><th>Role</th><th>Start</th><th>End</th></tr></thead><tbody>{committeeMemberships.map((item) => <tr key={item.id}><td data-label="Committee"><strong>{item.committee.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.committee.code}</small></td><td data-label="Member"><strong>{item.member.firstName} {item.member.lastName}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.member.membershipNo}</small></td><td data-label="Chapter"><strong>{item.committee.chapter.name}</strong><small style={{ display: "block", color: "#746b5b" }}>{item.committee.chapter.code}</small></td><td data-label="Role">{item.roleLabel || "Member"}</td><td data-label="Start">{item.startsAt.toLocaleDateString("en-PH")}</td><td data-label="End">{item.endsAt ? item.endsAt.toLocaleDateString("en-PH") : "Current"}</td></tr>)}</tbody></table></div> : <p style={{ color: "#6b665c" }}>No committee memberships match the current search and filters.</p>
          )}

          <AdminPagination pathname="/admin/organization" page={page} totalPages={totalPages} totalItems={totalItems} query={{ q: q || undefined, chapter: chapterFilter || undefined, history }} />
        </section>
      </div>
    </main>
  );
}
