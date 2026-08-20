import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { OrganizationManager } from "@/components/admin/organization-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const memberManage = authorizedChapterIds(context, "members.manage");
  const chapterManage = authorizedChapterIds(context, "chapters.manage");
  const national = memberManage === null || chapterManage === null;
  const scope = national ? null : Array.from(new Set([...(memberManage ?? []), ...(chapterManage ?? [])]));
  if (scope !== null && scope.length === 0) redirect("/admin");

  const chapters = await prisma.chapters.findMany({
    where: scope === null ? { status: "ACTIVE" } : { id: { in: scope }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const ids = chapters.map((chapter) => chapter.id);

  const [members, positions, committees, assignments, committeeMemberships] = await Promise.all([
    prisma.member.findMany({ where: { chapterId: { in: ids }, membershipStatus: "ACTIVE" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, chapterId: true, membershipNo: true, firstName: true, lastName: true } }),
    prisma.chapterPosition.findMany({ where: { chapterId: { in: ids }, isActive: true }, orderBy: [{ chapterId: "asc" }, { level: "asc" }, { name: "asc" }], select: { id: true, chapterId: true, name: true, code: true, level: true } }),
    prisma.committee.findMany({ where: { chapterId: { in: ids }, isActive: true }, orderBy: { name: "asc" }, select: { id: true, chapterId: true, name: true, code: true } }),
    prisma.officerAssignment.findMany({ where: { position: { chapterId: { in: ids } } }, orderBy: { startsAt: "desc" }, take: 300, include: { member: { select: { membershipNo: true, firstName: true, lastName: true } }, position: { select: { name: true, chapterId: true } } } }),
    prisma.committeeMembership.findMany({ where: { committee: { chapterId: { in: ids } } }, orderBy: { startsAt: "desc" }, take: 300, include: { member: { select: { membershipNo: true, firstName: true, lastName: true } }, committee: { select: { name: true, chapterId: true } } } }),
  ]);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Governance</p><h1>Chapter Organization</h1></div>
        <OrganizationManager chapters={chapters} members={members} positions={positions.map((position) => ({ id: position.id, chapterId: position.chapterId, name: position.name }))} committees={committees.map((committee) => ({ id: committee.id, chapterId: committee.chapterId, name: committee.name }))} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginTop: 18 }}>
          <section className="app-panel"><h2>Officer History</h2>{assignments.map((item) => <div key={item.id} style={{ padding: "10px 0", borderTop: "1px solid #eee5d4" }}><strong>{item.position.name}</strong><div>{item.member.membershipNo} · {item.member.firstName} {item.member.lastName}</div><small>{item.startsAt.toLocaleDateString("en-PH")} → {item.endsAt ? item.endsAt.toLocaleDateString("en-PH") : "Current"}</small></div>)}</section>
          <section className="app-panel"><h2>Committee History</h2>{committeeMemberships.map((item) => <div key={item.id} style={{ padding: "10px 0", borderTop: "1px solid #eee5d4" }}><strong>{item.committee.name}{item.roleLabel ? ` · ${item.roleLabel}` : ""}</strong><div>{item.member.membershipNo} · {item.member.firstName} {item.member.lastName}</div><small>{item.startsAt.toLocaleDateString("en-PH")} → {item.endsAt ? item.endsAt.toLocaleDateString("en-PH") : "Current"}</small></div>)}</section>
        </div>
      </div>
    </main>
  );
}
