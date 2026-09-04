import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { AnnouncementManager } from "@/components/admin/announcement-manager";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const scope = authorizedChapterIds(context, "content.manage");
  const canPublishNational = context.assignments.some((assignment) => assignment.chapterId === null && assignment.permissions.includes("content.manage"));
  if (!canPublishNational && Array.isArray(scope) && scope.length === 0) redirect("/admin");

  const chapters = await prisma.chapters.findMany({
    where: scope === null ? { status: "ACTIVE" } : { id: { in: scope }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const recent = await prisma.announcement.findMany({
    where: canPublishNational
      ? undefined
      : { chapterId: { in: scope ?? [] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { chapter: { select: { name: true } } },
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Communications</p>
          <h1>Announcements</h1>
        </div>
        <div className="admin-two-column">
          <AnnouncementManager chapters={chapters} canPublishNational={canPublishNational} />
          <section className="app-panel">
            <h2 style={{ marginTop: 0 }}>Recent Announcements</h2>
            <div className="admin-history-list">
              {recent.length === 0 ? <p style={{ color: "#6b665c" }}>No announcements yet.</p> : recent.map((item) => {
                const imageUrl = contentMediaUrl("announcement", item.id, item.imageUrl);
                return (
                  <article key={item.id} style={{ padding: "14px 0" }}>
                    {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, marginBottom: 10 }} /> : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <strong>{item.title}</strong>
                      <small>{item.audience === "NATIONAL" ? "National" : item.chapter?.name ?? "Chapter"}</small>
                      {item.isPinned && <small style={{ fontWeight: 900, color: "#7c5a00" }}>PINNED</small>}
                    </div>
                    <p style={{ color: "#6b665c", marginBottom: 6, lineHeight: 1.55 }}>{item.body}</p>
                    <small>{item.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</small>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
