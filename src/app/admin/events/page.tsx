import Link from "next/link";
import { redirect } from "next/navigation";
import { EventManager } from "@/components/admin/event-manager";
import { authorizedChapterIds, getAuthContext, hasPermission } from "@/lib/auth/context";
import { contentMediaUrl } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const scope = authorizedChapterIds(context, "events.manage");
  const canNational = hasPermission(context, "events.manage", null);
  if (scope !== null && scope.length === 0) redirect("/admin");

  const [chapters, events] = await Promise.all([
    prisma.chapters.findMany({
      where: { status: "ACTIVE", ...(scope === null ? {} : { id: { in: scope } }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.event.findMany({
      where: scope === null ? {} : { chapterId: { in: scope } },
      orderBy: { startsAt: "desc" },
      take: 100,
      select: { id: true, title: true, status: true, chapterId: true, startsAt: true, venue: true, imageUrl: true },
    }),
  ]);

  return (
    <main className="app-shell">
      <header className="app-topbar"><div className="container app-nav"><Link className="app-brand" href="/admin"><img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" /><span>PSP Administration</span></Link><Link className="btn" href="/admin" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Admin Home</Link></div></header>
      <div className="container app-main">
        <div className="app-greeting"><p>Events</p><h1>National & Chapter Event Management</h1></div>
        <EventManager
          chapters={chapters}
          canNational={canNational}
          initialEvents={events.map((event) => ({
            ...event,
            startsAt: event.startsAt.toISOString(),
            imageUrl: contentMediaUrl("event", event.id, event.imageUrl),
          }))}
        />
      </div>
    </main>
  );
}
