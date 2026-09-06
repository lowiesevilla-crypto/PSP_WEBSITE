import type { AuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const PAYMONGO_LIVE_APPROVAL_ENTITY = "PSP_PAYMONGO_LIVE";
export const PAYMONGO_LIVE_APPROVAL_GRANTED = "PAYMONGO_LIVE_APPROVAL_GRANTED";
export const PAYMONGO_LIVE_APPROVAL_REVOKED = "PAYMONGO_LIVE_APPROVAL_REVOKED";

export type PayMongoLiveApprovalStatus = {
  approved: boolean;
  approvedAt: Date | null;
  approvedBy: { id: string; displayName: string; email: string } | null;
  notes: string | null;
  serverLiveEnabled: boolean;
};

export function isPayMongoLiveServerEnabled() {
  return process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true";
}

export function canApprovePayMongoLive(context: AuthContext) {
  return context.assignments.some(
    (assignment) =>
      assignment.chapterId === null &&
      assignment.permissions.includes("finance.manage"),
  );
}

function noteFromMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const notes = (value as Record<string, unknown>).notes;
  return typeof notes === "string" && notes.trim() ? notes.trim() : null;
}

export async function getPayMongoLiveApprovalStatus(): Promise<PayMongoLiveApprovalStatus> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      entityType: "PayMongoLiveApproval",
      entityId: PAYMONGO_LIVE_APPROVAL_ENTITY,
      action: { in: [PAYMONGO_LIVE_APPROVAL_GRANTED, PAYMONGO_LIVE_APPROVAL_REVOKED] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      action: true,
      createdAt: true,
      metadataJson: true,
      actor: { select: { id: true, displayName: true, email: true } },
    },
  });

  const approved = latest?.action === PAYMONGO_LIVE_APPROVAL_GRANTED;
  return {
    approved,
    approvedAt: approved ? latest?.createdAt ?? null : null,
    approvedBy: approved && latest?.actor ? latest.actor : null,
    notes: approved ? noteFromMetadata(latest?.metadataJson) : null,
    serverLiveEnabled: isPayMongoLiveServerEnabled(),
  };
}

export async function assertPayMongoLiveApproval() {
  const status = await getPayMongoLiveApprovalStatus();
  if (!status.approved) {
    throw new Error(
      "National Admin TEST acceptance and LIVE approval is required. Open Admin > Live Approval (/admin/finance/live-approval), complete the TEST signoff checklist, and approve LIVE processing.",
    );
  }
  if (!status.serverLiveEnabled) {
    throw new Error(
      "National Admin LIVE approval is recorded, but the server LIVE kill-switch is OFF. Set PAYMONGO_LIVE_ENABLED=true in the Hostinger production environment, redeploy, then re-check activation readiness.",
    );
  }
  return status;
}

export async function assertPayMongoLiveApprovalForSecret(secretKey: string) {
  if (secretKey.trim().startsWith("sk_live_")) {
    await assertPayMongoLiveApproval();
  }
}
