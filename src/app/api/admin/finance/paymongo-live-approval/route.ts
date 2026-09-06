import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import {
  canApprovePayMongoLive,
  getPayMongoLiveApprovalStatus,
  PAYMONGO_LIVE_APPROVAL_ENTITY,
  PAYMONGO_LIVE_APPROVAL_GRANTED,
  PAYMONGO_LIVE_APPROVAL_REVOKED,
} from "@/lib/paymongo/live-approval";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
    testDuesPaymentVerified: z.literal(true),
    testContributionPaymentVerified: z.literal(true),
    webhookAndReceiptVerified: z.literal(true),
    notes: z.string().trim().max(500).optional().default(""),
  }),
  z.object({
    action: z.literal("REVOKE"),
    reason: z.string().trim().min(5).max(500),
  }),
]);

async function requireNationalApprover() {
  const context = await getAuthContext();
  if (!context) {
    return { context: null, response: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  }
  if (!canApprovePayMongoLive(context)) {
    return { context: null, response: NextResponse.json({ message: "National Finance Administrator approval is required." }, { status: 403 }) };
  }
  return { context, response: null };
}

export async function GET() {
  const access = await requireNationalApprover();
  if (!access.context) return access.response;
  const status = await getPayMongoLiveApprovalStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await requireNationalApprover();
  if (!access.context) return access.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Complete every TEST acceptance confirmation before approving LIVE processing, or provide a revocation reason." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.action === "APPROVE") {
    await prisma.auditLog.create({
      data: {
        actorUserId: access.context.user.id,
        chapterId: null,
        action: PAYMONGO_LIVE_APPROVAL_GRANTED,
        entityType: "PayMongoLiveApproval",
        entityId: PAYMONGO_LIVE_APPROVAL_ENTITY,
        metadataJson: {
          testDuesPaymentVerified: true,
          testContributionPaymentVerified: true,
          webhookAndReceiptVerified: true,
          notes: input.notes || null,
          approvalScope: "PSP_PLATFORM_LIVE_PROCESSING",
        },
      },
    });
  } else {
    await prisma.auditLog.create({
      data: {
        actorUserId: access.context.user.id,
        chapterId: null,
        action: PAYMONGO_LIVE_APPROVAL_REVOKED,
        entityType: "PayMongoLiveApproval",
        entityId: PAYMONGO_LIVE_APPROVAL_ENTITY,
        metadataJson: {
          reason: input.reason,
          approvalScope: "PSP_PLATFORM_LIVE_PROCESSING",
        },
      },
    });
  }

  const status = await getPayMongoLiveApprovalStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
