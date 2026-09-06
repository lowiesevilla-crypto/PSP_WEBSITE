import Link from "next/link";
import { MembershipStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { MemberAdminActions } from "@/components/admin/member-admin-actions";
import { MemberEditForm } from "@/components/admin/member-edit-form";
import { MemberTransferForm } from "@/components/admin/member-transfer-form";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const FILTERABLE_STATUSES: MembershipStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "TRANSFERRED",
  "RESIGNED",
  "DECEASED",
];

type SearchParams = Promise<{
  q?: string | string[];
  chapter?: string | string[];
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

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const viewScope = authorizedChapterIds(context, "members.view");
  if (viewScope !== null && viewScope.length === 0) redirect("/admin");
  const manageScope = authorizedChapterIds(context, "members.manage");

  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const requestedStatus = (single(params.status) ?? "").trim().toUpperCase();
  const requestedPage = parsePage(single(params.page));

  const visibleChapters = await prisma.chapters.findMany({
    where: viewScope === null ? undefined : { id: { in: viewScope } },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });
  const chapterFilter = visibleChapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const statusFilter = FILTERABLE_STATUSES.includes(requestedStatus as MembershipStatus)
    ? requestedStatus as MembershipStatus
    : null;

  const where: Prisma.MemberWhereInput = {
    membershipStatus: statusFilter ?? { not: "ARCHIVED" },
    ...(viewScope === null ? {} : { chapterId: { in: viewScope } }),
    ...(chapterFilter ? { chapterId: chapterFilter } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { membershipNo: { contains: q } },
            { pspBirthdayCode: { contains: q } },
            { user: { email: { contains: q } } },
            { chapter: { name: { contains: q } } },
            { chapter: { code: { contains: q } } },
          ],
        }
      : {}),
  };

  const totalItems = await prisma.member.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const [members, manageableChapters] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        chapter: { select: { id: true, code: true, name: true } },
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
            passwordHash: true,
          },
        },
      },
    }),
    prisma.chapters.findMany({
      where: {
        status: "ACTIVE",
        ...(manageScope === null ? {} : { id: { in: manageScope } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const paginationQuery = {
    q: q || undefined,
    chapter: chapterFilter || undefined,
    status: statusFilter ?? undefined,
  };

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Membership</p>
            <h1>Member Directory</h1>
            <p style={{ marginTop: 8, maxWidth: 760, color: "#746b5b", lineHeight: 1.55 }}>
              Search and manage members inside your authorized scope. National Admin can work across authorized Chapters; Chapter Admin remains restricted to the exact Chapter assigned to the account. Profile edits are audited and never change login email, membership number, Chapter history or finance records.
            </p>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        <form className="admin-list-toolbar" method="get" action="/admin/members">
          <label className="admin-search-field">
            Search members
            <input name="q" defaultValue={q} placeholder="Name, email, member no., PSP code, Chapter…" />
          </label>
          <label>
            Chapter
            <select name="chapter" defaultValue={chapterFilter}>
              <option value="">All authorized Chapters</option>
              {visibleChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}
            </select>
          </label>
          <label>
            Membership status
            <select name="status" defaultValue={statusFilter ?? ""}>
              <option value="">All retained statuses</option>
              {FILTERABLE_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">Search / Filter</button>
          <Link className="btn" href="/admin/members" style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
        </form>

        {members.length === 0 ? (
          <div className="app-panel"><p style={{ margin: 0 }}>No members match the current search and filters in your authorized scope.</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-responsive-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Chapter</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>PSP Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const memberName = [member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ");
                  const canManage = hasPermission(context, "members.manage", member.chapterId);
                  const activationRequired =
                    member.user.status !== "ACTIVE" ||
                    !member.user.emailVerifiedAt ||
                    !member.user.passwordHash;
                  const canResendInvitation =
                    canManage &&
                    member.membershipStatus === "ACTIVE" &&
                    member.user.status !== "SUSPENDED" &&
                    member.user.status !== "DISABLED" &&
                    activationRequired;

                  return (
                    <tr key={member.id}>
                      <td data-label="Member">
                        <strong>{memberName}</strong>
                        <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{member.membershipNo}</small>
                      </td>
                      <td data-label="Chapter">
                        <strong>{member.chapter.name}</strong>
                        <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{member.chapter.code}</small>
                      </td>
                      <td data-label="Status">
                        <strong>{member.membershipStatus}</strong>
                        <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>Account: {member.user.status}</small>
                      </td>
                      <td data-label="Contact">
                        <div style={{ overflowWrap: "anywhere" }}>{member.user.email}</div>
                        <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{member.mobile || "No mobile recorded"}</small>
                      </td>
                      <td data-label="PSP Details">
                        <div><small style={{ color: "#746b5b" }}>Birthday Code</small><br/><strong>{member.pspBirthdayCode || "—"}</strong></div>
                        <div style={{ marginTop: 7 }}><small style={{ color: "#746b5b" }}>Date Survive</small><br/><strong>{member.dateSurvive?.toLocaleDateString("en-PH") || "—"}</strong></div>
                      </td>
                      <td data-label="Actions">
                        {canManage ? (
                          <div className="admin-table-actions">
                            <MemberEditForm member={{
                              id: member.id,
                              membershipNo: member.membershipNo,
                              firstName: member.firstName,
                              lastName: member.lastName,
                              middleInitial: member.middleInitial,
                              address: member.address,
                              mobile: member.mobile,
                              dateSurvive: member.dateSurvive ? member.dateSurvive.toISOString().slice(0, 10) : null,
                              surviveLocation: member.surviveLocation,
                              pspBirthdayCode: member.pspBirthdayCode,
                              birthDate: member.birthDate ? member.birthDate.toISOString().slice(0, 10) : null,
                            }} />
                            <MemberTransferForm
                              memberId={member.id}
                              currentChapterId={member.chapterId}
                              chapters={manageableChapters}
                            />
                            <MemberAdminActions
                              memberId={member.id}
                              memberName={memberName}
                              canResendInvitation={canResendInvitation}
                              isSelf={context.user.id === member.user.id}
                            />
                          </div>
                        ) : <span style={{ color: "#746b5b" }}>View only</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination
          pathname="/admin/members"
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          query={paginationQuery}
        />
      </div>
    </main>
  );
}
