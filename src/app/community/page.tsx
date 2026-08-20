import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityFeed } from "@/components/community/community-feed";
import { hasPermission } from "@/lib/auth/context";
import { requireCurrentMember } from "@/lib/member/current-member";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  let context;
  let member;
  try {
    ({ context, member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Community</span>
          </Link>
          <div style={{ color: "#6b665c", fontSize: ".86rem" }}>{member.chapter.name}</div>
        </div>
      </header>
      <div className="container app-main" style={{ maxWidth: 820 }}>
        <div className="app-greeting">
          <p>Community</p>
          <h1>Chapter & National Updates</h1>
        </div>
        <CommunityFeed currentUserId={context.user.id} canPostNational={hasPermission(context, "content.manage", null)} />
      </div>
    </main>
  );
}
