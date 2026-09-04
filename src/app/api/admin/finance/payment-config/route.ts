import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/encryption";

export const dynamic = "force-dynamic";

const paymentMethods = ["card", "gcash", "paymaya", "qrph"] as const;
const schema = z.object({
  chapterId: z.string().min(1),
  mode: z.enum(["TEST", "LIVE"]),
  secretKey: z.string().trim().min(1).max(500).optional(),
  webhookSecret: z.string().trim().min(1).max(500).optional(),
  paymentMethods: z.array(z.enum(paymentMethods)).min(1).max(paymentMethods.length),
  isEnabled: z.boolean(),
});

function canManage(context: Awaited<ReturnType<typeof getAuthContext>>, chapterId: string) {
  if (!context) return false;
  return (
    hasPermission(context, "finance.manage", chapterId) ||
    hasPermission(context, "applications.review", chapterId) ||
    hasPermission(context, "chapters.manage", chapterId)
  );
}

function webhookUrl(chapterCode: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://psp.hoahub.tech").replace(/\/$/, "");
  return `${appUrl}/api/webhooks/paymongo/${encodeURIComponent(chapterCode)}`;
}

export async function GET(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const chapterId = new URL(request.url).searchParams.get("chapterId");
  if (!chapterId || !canManage(context, chapterId)) {
    return NextResponse.json({ message: "Chapter payment configuration permission required." }, { status: 403 });
  }

  const chapter = await prisma.chapters.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      code: true,
      name: true,
      paymentConfig: {
        select: {
          mode: true,
          paymentMethods: true,
          isEnabled: true,
          secretKeyCiphertext: true,
          webhookSecretCiphertext: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!chapter) return NextResponse.json({ message: "Chapter not found." }, { status: 404 });

  return NextResponse.json(
    {
      chapter: { id: chapter.id, code: chapter.code, name: chapter.name },
      config: chapter.paymentConfig
        ? {
            mode: chapter.paymentConfig.mode,
            paymentMethods: chapter.paymentConfig.paymentMethods,
            isEnabled: chapter.paymentConfig.isEnabled,
            hasSecretKey: Boolean(chapter.paymentConfig.secretKeyCiphertext),
            hasWebhookSecret: Boolean(chapter.paymentConfig.webhookSecretCiphertext),
            updatedAt: chapter.paymentConfig.updatedAt,
          }
        : null,
      webhookUrl: webhookUrl(chapter.code),
      liveGloballyEnabled: process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please review the chapter PayMongo configuration." }, { status: 400 });
  }
  const input = parsed.data;
  if (!canManage(context, input.chapterId)) {
    return NextResponse.json({ message: "Chapter payment configuration permission required." }, { status: 403 });
  }

  const chapter = await prisma.chapters.findUnique({
    where: { id: input.chapterId },
    select: { id: true, code: true, name: true },
  });
  if (!chapter) return NextResponse.json({ message: "Chapter not found." }, { status: 404 });

  const existing = await prisma.chapterPaymentConfig.findUnique({ where: { chapterId: chapter.id } });
  if (!existing && (!input.secretKey || !input.webhookSecret)) {
    return NextResponse.json({ message: "Secret key and webhook secret are required for the first chapter PayMongo setup." }, { status: 400 });
  }

  if (input.secretKey) {
    const expectedPrefix = input.mode === "LIVE" ? "sk_live_" : "sk_test_";
    if (!input.secretKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ message: `${input.mode} mode requires a matching ${expectedPrefix} PayMongo secret key.` }, { status: 400 });
    }
  }

  const liveGloballyEnabled = process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true";
  if (input.mode === "LIVE" && input.isEnabled && !liveGloballyEnabled) {
    return NextResponse.json(
      { message: "Live PayMongo cannot be enabled until test-mode E2E is signed off and PAYMONGO_LIVE_ENABLED=true is explicitly approved." },
      { status: 409 },
    );
  }

  try {
    const secretKeyCiphertext = input.secretKey
      ? encryptSecret(input.secretKey)
      : existing?.secretKeyCiphertext;
    const webhookSecretCiphertext = input.webhookSecret
      ? encryptSecret(input.webhookSecret)
      : existing?.webhookSecretCiphertext;
    if (!secretKeyCiphertext || !webhookSecretCiphertext) {
      return NextResponse.json({ message: "Chapter payment credentials are incomplete." }, { status: 400 });
    }

    const config = await prisma.$transaction(async (tx) => {
      const saved = await tx.chapterPaymentConfig.upsert({
        where: { chapterId: chapter.id },
        create: {
          chapterId: chapter.id,
          gateway: "PAYMONGO",
          mode: input.mode,
          secretKeyCiphertext,
          webhookSecretCiphertext,
          paymentMethods: input.paymentMethods,
          isEnabled: input.isEnabled,
        },
        update: {
          mode: input.mode,
          secretKeyCiphertext,
          webhookSecretCiphertext,
          paymentMethods: input.paymentMethods,
          isEnabled: input.isEnabled,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: chapter.id,
          action: "CHAPTER_PAYMONGO_CONFIG_UPDATED",
          entityType: "ChapterPaymentConfig",
          entityId: saved.id,
          metadataJson: {
            mode: input.mode,
            isEnabled: input.isEnabled,
            paymentMethods: input.paymentMethods,
            secretKeyRotated: Boolean(input.secretKey),
            webhookSecretRotated: Boolean(input.webhookSecret),
          },
        },
      });
      return saved;
    });

    return NextResponse.json(
      {
        config: {
          mode: config.mode,
          isEnabled: config.isEnabled,
          paymentMethods: config.paymentMethods,
          hasSecretKey: true,
          hasWebhookSecret: true,
        },
        webhookUrl: webhookUrl(chapter.code),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Chapter PayMongo configuration error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save chapter PayMongo configuration." },
      { status: 500 },
    );
  }
}
