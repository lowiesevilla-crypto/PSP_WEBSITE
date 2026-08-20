import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/member/notification-list";
import { requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  let context;
  try {
    context = await requireAuthContext();
  } catch {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Dashboard</Link>
        </div>
      </header>
      <div className="container app-main">
        <div className="app-greeting">
          <p>Member Center</p>
          <h1>Notifications</h1>
        </div>
        <NotificationList initial={notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() ?? null }))} />
      </div>
    </main>
  );
}
