import { redirect } from "next/navigation";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  let current;
  try {
    current = await requireCurrentMember();
  } catch {
    redirect("/login");
  }
  const { member } = current;
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ audience: "NATIONAL" }, { audience: "CHAPTER", chapterId: member.chapterId }],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { chapter: { select: { name: true } } },
    take: 100,
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Official Updates</p><h1>Announcements</h1></div>
        <section style={{ display: "grid", gap: 14, maxWidth: 820, margin: "0 auto" }}>
          {announcements.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No active announcements.</p></div> : announcements.map((item) => {
            const imageUrl = contentMediaUrl("announcement", item.id, item.imageUrl);
            return (
              <article id={item.id} key={item.id} className="app-panel" style={{ overflow: "hidden" }}>
                {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", maxHeight: 440, objectFit: "cover", borderRadius: 16, marginBottom: 14 }} /> : null}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {item.isPinned && <small style={{ fontWeight: 900 }}>PINNED</small>}
                  <small style={{ color: "#746b5b" }}>{item.audience === "NATIONAL" ? "National" : item.chapter?.name ?? "Chapter"}</small>
                </div>
                <h2 style={{ overflowWrap: "anywhere" }}>{item.title}</h2>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#575249", overflowWrap: "anywhere" }}>{item.body}</p>
                <small style={{ color: "#746b5b" }}>{item.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}</small>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
