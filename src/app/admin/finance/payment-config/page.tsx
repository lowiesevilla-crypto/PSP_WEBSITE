import Link from "next/link";
import { redirect } from "next/navigation";
import { ChapterPaymentConfig } from "@/components/admin/chapter-payment-config";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChapterPaymentConfigPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const financeScope = authorizedChapterIds(context, "finance.manage");
  const reviewScope = authorizedChapterIds(context, "applications.review");
  const chapterManageScope = authorizedChapterIds(context, "chapters.manage");
  const national = financeScope === null || reviewScope === null || chapterManageScope === null;
  const ids = national
    ? null
    : Array.from(new Set([...(financeScope ?? []), ...(reviewScope ?? []), ...(chapterManageScope ?? [])]));
  if (!national && ids?.length === 0) redirect("/admin");

  const chapters = await prisma.chapters.findMany({
    where: national ? { status: "ACTIVE" } : { id: { in: ids ?? [] }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/admin"><img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" /><span>PSP Payment Setup</span></Link>
          <Link className="btn" href="/admin" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Admin</Link>
        </div>
      </header>
      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div className="app-greeting"><p>Chapter Finance</p><h1>Online Payment Gateway</h1></div>
        <ChapterPaymentConfig chapters={chapters} />
      </div>
    </main>
  );
}
