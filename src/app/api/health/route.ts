import { NextResponse } from "next/server";
import {
  PSP_DEPLOYMENT_GENERATION,
  PSP_RELEASE_ID,
} from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "psi-sigma-phi-digital-platform",
      release: PSP_RELEASE_ID,
      deploymentGeneration: PSP_DEPLOYMENT_GENERATION,
      financePaymentConfigVersion: "chapter-draft-ux-v2",
      paymentActivationUxVersion: "national-admin-v2",
      paymongoLiveApprovalVersion: "national-signoff-v1",
      certificateHotfixVersion: "chapter-logo-email-invalidation-v1",
      billingDuesVersion: "chapter-national-v1",
      splitPaymentContractVersion: "linked-split-e2e-v1",
      paymentAssignmentVersion: "chapter-selected-member-v1",
      financeLayoutVersion: "full-bill-editor-balance-actions-v1",
      publicFeedVersion: "global-chapter-feed-v2",
      publicFeedMediaVersion: "image-archive-v1",
      chapterFundsVersion: "month-year-expense-ledger-v1",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
