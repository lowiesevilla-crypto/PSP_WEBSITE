import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import { createLinkedWebhook } from "@/lib/paymongo/client";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";

export const dynamic = "force-dynamic";

const paymentMethods = ["gcash", "paymaya", "qrph"] as const;
const schema = z.object({
  chapterId: z.string().min(1),
  mode: z.enum(["TEST", "LIVE"]),
  linkedAccountId: z.string().trim().regex(/^org_[A-Za-z0-9]+$/, "Linked PayMongo account must be an org_* id."),
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

  let linkedAccountId: string | null = null;
  if (chapter.paymentConfig?.secretKeyCiphertext) {
    try {
      const value = decryptSecret(chapter.paymentConfig.secretKeyCiphertext);
      linkedAccountId = value.startsWith("org_") ? value : null;
    } catch {
      linkedAccountId = null;
    }
  }

  let platformReady = false;
  let platformMode: "TEST" | "LIVE" | null = null;
  try {
    const platform = getPlatformPayMongoConfig();
    platformReady = true;
    platformMode = platform.mode;
  } catch {
    platformReady = false;
  }

  return NextResponse.json(
    {
      chapter: { id: chapter.id, code: chapter.code, name: chapter.name },
      config: chapter.paymentConfig
        ? {
            mode: chapter.paymentConfig.mode,
            linkedAccountId,
            paymentMethods: chapter.paymentConfig.paymentMethods,
            isEnabled: chapter.paymentConfig.isEnabled,
            hasWebhookSecret: Boolean(chapter.paymentConfig.webhookSecretCiphertext),
            updatedAt: chapter.paymentConfig.updatedAt,
          }
        : null,
      webhookUrl: webhookUrl(chapter.code),
      platformReady,
      platformMode,
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
    return NextResponse.json({ message: "Please review the chapter PayMongo linked-account configuration." }, { status: 400 });
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

  let platform;
  try {
    platform = getPlatformPayMongoConfig();
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "PSP PayMongo platform configuration is unavailable." },
      { status: 409 },
    );
  }
  if (platform.mode !== input.mode) {
    return NextResponse.json(
      { message: `Chapter mode ${input.mode} must match PSP PayMongo platform mode ${platform.mode}.` },
      { status: 409 },
    );
  }

  // Encryption is intentionally randomized, so ciphertext cannot be used as a
  // meaningful database uniqueness key. Enforce one linked PayMongo child
  // Account-Id per PSP chapter by comparing decrypted values server-side.
  const otherChapterConfigs = await prisma.chapterPaymentConfig.findMany({
    where: { chapterId: { not: chapter.id } },
    select: { secretKeyCiphertext: true },
  });
  for (const otherConfig of otherChapterConfigs) {
    try {
      if (decryptSecret(otherConfig.secretKeyCiphertext) === input.linkedAccountId) {
        return NextResponse.json(
          { message: "This PayMongo linked account is already assigned to another PSP chapter." },
          { status: 409 },
        );
      }
    } catch {
      // A legacy/corrupt encrypted value must not leak details here. That
      // configuration will fail normal runtime validation until corrected by
      // an authorized administrator.
    }
  }

  const existing = await prisma.chapterPaymentConfig.findUnique({ where: { chapterId: chapter.id } });
  let existingLinkedAccountId: string | null = null;
  if (existing?.secretKeyCiphertext) {
    try {
      existingLinkedAccountId = decryptSecret(existing.secretKeyCiphertext);
    } catch {
      existingLinkedAccountId = null;
    }
  }
  const linkedAccountChanged = existingLinkedAccountId !== input.linkedAccountId;

  try {
    let webhookSecretCiphertext = existing?.webhookSecretCiphertext;
    let webhookCreated = false;
    let webhookId: string | null = null;

    if (input.webhookSecret) {
      webhookSecretCiphertext = encryptSecret(input.webhookSecret);
    } else if (!webhookSecretCiphertext || linkedAccountChanged) {
      const createdWebhook = await createLinkedWebhook({
        secretKey: platform.secretKey,
        childAccountId: input.linkedAccountId,
        url: webhookUrl(chapter.code),
      });
      webhookSecretCiphertext = encryptSecret(createdWebhook.secret);
      webhookCreated = true;
      webhookId = createdWebhook.id;
    }

    if (!webhookSecretCiphertext) {
      return NextResponse.json({ message: "Chapter webhook signing secret is unavailable." }, { status: 400 });
    }

    const linkedAccountCiphertext = encryptSecret(input.linkedAccountId);
    const config = await prisma.$transaction(async (tx) => {
      const saved = await tx.chapterPaymentConfig.upsert({
        where: { chapterId: chapter.id },
        create: {
          chapterId: chapter.id,
          gateway: "PAYMONGO",
          mode: input.mode,
          secretKeyCiphertext: linkedAccountCiphertext,
          webhookSecretCiphertext,
          paymentMethods: input.paymentMethods,
          isEnabled: input.isEnabled,
        },
        update: {
          mode: input.mode,
          secretKeyCiphertext: linkedAccountCiphertext,
          webhookSecretCiphertext,
          paymentMethods: input.paymentMethods,
          isEnabled: input.isEnabled,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: chapter.id,
          action: "CHAPTER_PAYMONGO_LINKED_ACCOUNT_UPDATED",
          entityType: "ChapterPaymentConfig",
          entityId: saved.id,
          metadataJson: {
            mode: input.mode,
            isEnabled: input.isEnabled,
            paymentMethods: input.paymentMethods,
            linkedAccountChanged,
            webhookCreated,
            webhookId,
          },
        },
      });
      return saved;
    });

    return NextResponse.json(
      {
        config: {
          mode: config.mode,
          linkedAccountId: input.linkedAccountId,
          isEnabled: config.isEnabled,
          paymentMethods: config.paymentMethods,
          hasWebhookSecret: true,
        },
        webhookUrl: webhookUrl(chapter.code),
        webhookCreated,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Chapter PayMongo linked-account configuration error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save chapter PayMongo linked-account configuration." },
      { status: 502 },
    );
  }
}
