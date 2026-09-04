import Link from "next/link";
import { redirect } from "next/navigation";
import {
  authorizedChapterIds,
  getAuthContext,
  hasPermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { ChapterCreateForm } from "@/components/admin/chapter-create-form";
import { ChapterAdminAssignmentForm } from "@/components/admin/chapter-admin-assignment-form";
import { ChapterStatusControl } from "@/components/admin/chapter-status-control";

export const dynamic = "force-dynamic";

export default async function ChaptersPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const scope = authorizedChapterIds(context, "chapters.view");
  if (scope !== null && scope.length === 0) redirect("/admin");
  const canManage = hasPermission(context, "chapters.manage", null);

  const chapters = await prisma.chapters.findMany({
    where: scope === null ? undefined : { id: { in: scope } },
    orderBy: { name: "asc" },
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
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        {canManage ? <div style={{ marginBottom: 20 }}><ChapterCreateForm /></div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {chapters.map((chapter) => (
            <article className="app-panel" key={chapter.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <small style={{ color: "#746b5b", fontWeight: 800 }}>{chapter.code}</small>
                  <h2 style={{ margin: "4px 0 0" }}>{chapter.name}</h2>
                </div>
                <span style={{ padding: "6px 9px", borderRadius: 999, background: chapter.status === "ACTIVE" ? "#fff4c8" : "#f2efe8", fontSize: ".75rem", fontWeight: 900 }}>{chapter.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                <Metric label="Members" value={chapter._count.members} />
                <Metric label="Applications" value={chapter._count.applications} />
              </div>
              <div style={{ marginTop: 16 }}>
                <strong>Chapter Administrator{chapter.roleAssignments.length === 1 ? "" : "s"}</strong>
                {chapter.roleAssignments.length > 0 ? (
                  <ul style={{ paddingLeft: 20, color: "#665b47" }}>
                    {chapter.roleAssignments.map((assignment) => (
                      <li key={assignment.user.id}>
                        {assignment.user.displayName} · {assignment.user.email} · {assignment.user.status}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#746b5b" }}>No Chapter Administrator assigned yet.</p>
                )}
              </div>
              {canManage ? (
                <>
                  <ChapterStatusControl chapterId={chapter.id} chapterName={chapter.name} status={chapter.status} />
                  <ChapterAdminAssignmentForm chapterId={chapter.id} chapterStatus={chapter.status} />
                </>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "#f7f4ec" }}>
      <small style={{ color: "#746b5b" }}>{label}</small>
      <strong style={{ display: "block", fontSize: "1.25rem" }}>{value}</strong>
    </div>
  );
}
