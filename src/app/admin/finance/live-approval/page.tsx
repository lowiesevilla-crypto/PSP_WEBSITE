import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { canApprovePayMongoLive } from "@/lib/paymongo/live-approval";
import { PayMongoLiveApprovalControl } from "@/components/admin/paymongo-live-approval-control";

export const dynamic = "force-dynamic";

export default async function PayMongoLiveApprovalPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!canApprovePayMongoLive(context)) redirect("/admin/finance");

  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 980 }}>
        <div className="app-greeting">
          <p>National Finance Control</p>
          <h1>PayMongo TEST Acceptance & LIVE Approval</h1>
          <p style={{ marginTop: 8, maxWidth: 800, color: "#746b5b", lineHeight: 1.55 }}>
            Record the controlled TEST acceptance required before PSP permits LIVE PayMongo provider actions. This approval is National-only, auditable, and remains separate from the Hostinger server LIVE kill-switch.
          </p>
          <div style={{ marginTop: 12 }}><Link className="btn" href="/admin/finance" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>← Back to Finance</Link></div>
        </div>
        <PayMongoLiveApprovalControl />
      </div>
    </main>
  );
}
