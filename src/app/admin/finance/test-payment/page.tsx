import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { TestPaymentAcceptance } from "@/components/admin/test-payment-acceptance";

export const dynamic = "force-dynamic";

export default async function TestPaymentAcceptancePage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const manageScope = authorizedChapterIds(context, "finance.manage");
  if (manageScope !== null && manageScope.length === 0) {
    return (
      <main className="app-shell">
        <div className="container app-main" style={{ maxWidth: 920 }}>
          <div className="app-panel" style={{ border: "1px solid #e8b5b5", background: "#fff1f1" }}>
            <h1 style={{ marginTop: 0 }}>Finance management permission required</h1>
            <p style={{ lineHeight: 1.6 }}>
              Your current account can view this PSP area but does not have an active <code>finance.manage</code> Chapter scope. A properly assigned <strong>Chapter Administrator</strong> should have this permission for its exact Chapter.
            </p>
            <p style={{ lineHeight: 1.6 }}>
              Ask National Administration to verify the account under <strong>Admin → Users → Active Roles</strong>. The assignment must show <strong>Chapter Administrator</strong> scoped to the correct Chapter and must still be active.
            </p>
            <Link href="/admin/finance" className="btn btn-primary">Back to Finance</Link>
          </div>
        </div>
      </main>
    );
  }

  const chapters = await prisma.chapters.findMany({
    where: manageScope === null ? { status: "ACTIVE" } : { id: { in: manageScope }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (!chapters.length) redirect("/admin/finance");

  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          <div className="app-greeting">
            <p>Finance · Controlled Acceptance</p>
            <h1>PayMongo TEST Payment Setup</h1>
            <p style={{ marginTop: 8, maxWidth: 760, color: "#746b5b", lineHeight: 1.55 }}>
              Activate the Chapter in TEST mode, create a single-member TEST dues charge, and run the PayMongo split-payment acceptance without enabling LIVE processing or charging every Chapter member.
            </p>
          </div>
          <Link href="/admin/finance" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Finance</Link>
        </div>

        <TestPaymentAcceptance chapters={chapters} />
      </div>
    </main>
  );
}
