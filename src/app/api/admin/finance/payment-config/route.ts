import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import { createLinkedWebhook } from "@/lib/paymongo/client";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";
import {
  isPendingLinkedWebhookSecret,
  PENDING_LINKED_WEBHOOK_SECRET,
  type ChapterPaymentConfigurationState,
} from "@/lib/paymongo/chapter-config-state";

export const dynamic = "force-dynamic";

const paymentMethods = ["gcash", "paymaya", "qrph"] as const;
const schema = z.object({
  chapterId: z.string().min(1),
  mode: z.enum(["TEST", "LIVE"]),
  linkedAccountId: z.string().trim().regex(/^org_[A-Za-z0-9]+$/, "Linked PayMongo account must be an org_* id."),
  // Retained for controlled migration/testing compatibility. The normal Admin UI
  // never handles a plaintext child webhook signing secret.
  webhookSecret: z.string().trim().min(1).max(500).optional(),
  paymentMethods: z.array(z.enum(paymentMethods)).min(1).max(paymentMethods.length),
  isEnabled: z.boolean(),
});

type PlatformStatus = {
  ready: boolean;
  mode: "TEST" | "LIVE" | null;
  message: string | null;
};

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

function getPlatformStatus(): PlatformStatus {
  try {
    const platform = getPlatformPayMongoConfig();
    return { ready: true, mode: platform.mode, message: null };
  } catch (error) {
    return {
      ready: false,
      mode: null,
      message: error instanceof Error ? error.message : "PSP PayMongo platform configuration is unavailable.",
    };
  }
}

function decryptLinkedAccount(ciphertext: string | null | undefined) {
  if (!ciphertext) return null;
  try {
    const value = decryptSecret(ciphertext);
    return value.startsWith("org_") ? value : null;
  } catch {
    return null;
  }
}

function hasStoredWebhookSecret(ciphertext: string | null | undefined) {
  if (!ciphertext) return false;
  try {
    return !isPendingLinkedWebhookSecret(decryptSecret(ciphertext));
  } catch {
    return false;
  }
}

function readinessFor(input: {
  hasConfig: boolean;
  isEnabled: boolean;
  mode: string | null | undefined;
  linkedAccountId: string | null;
  hasWebhookSecret: boolean;
  platform: PlatformStatus;
}) {
  const activationBlockers: string[] = [];
  if (!input.linkedAccountId) activationBlockers.push("Save a valid PayMongo linked child Account ID (org_*).");
  if (!input.platform.ready) {
    activationBlockers.push(input.platform.message ?? "Complete the PSP PayMongo parent platform and convenience-fee configuration.");
  } else if (input.mode && input.mode !== input.platform.mode) {
    activationBlockers.push(`Chapter mode ${input.mode} must match PSP platform mode ${input.platform.mode}.`);
  }

  let configurationState: ChapterPaymentConfigurationState = "NOT_CONFIGURED";
  if (input.hasConfig) {
    if (input.isEnabled) {
      configurationState = activationBlockers.length === 0 && input.hasWebhookSecret ? "ENABLED" : "BLOCKED";
    } else {
      configurationState = activationBlockers.length === 0 ? "READY" : "DRAFT";
    }
  }

  return {
    configurationState,
    activationReady: activationBlockers.length === 0,
    activationBlockers,
  };
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

  const linkedAccountId = decryptLinkedAccount(chapter.paymentConfig?.secretKeyCiphertext);
  const hasWebhookSecret = hasStoredWebhookSecret(chapter.paymentConfig?.webhookSecretCiphertext);
  const platform = getPlatformStatus();
  const readiness = readinessFor({
    hasConfig: Boolean(chapter.paymentConfig),
    isEnabled: Boolean(chapter.paymentConfig?.isEnabled),
    mode: chapter.paymentConfig?.mode,
    linkedAccountId,
    hasWebhookSecret,
    platform,
  });

  return NextResponse.json(
    {
      chapter: { id: chapter.id, code: chapter.code, name: chapter.name },
      config: chapter.paymentConfig
        ? {
            mode: chapter.paymentConfig.mode,
            linkedAccountId,
            paymentMethods: chapter.paymentConfig.paymentMethods,
            isEnabled: chapter.paymentConfig.isEnabled,
            hasWebhookSecret,
            updatedAt: chapter.paymentConfig.updatedAt,
          }
        : null,
      webhookUrl: webhookUrl(chapter.code),
      platformReady: platform.ready,
      platformMode: platform.mode,
      platformMessage: platform.message,
      liveGloballyEnabled: process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true",
      ...readiness,
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

  let platform = null;
  if (input.isEnabled) {
    try {
      platform = getPlatformPayMongoConfig();
    } catch (error) {
      return NextResponse.json(
        {
          message: error instanceof Error
            ? `Chapter setup can be saved as a disabled draft, but online payment cannot be enabled yet: ${error.message}`
            : "Chapter setup can be saved as a disabled draft, but PSP PayMongo platform configuration is unavailable.",
        },
        { status: 409 },
      );
    }
    if (platform.mode !== input.mode) {
      return NextResponse.json(
        { message: `Chapter mode ${input.mode} must match PSP PayMongo platform mode ${platform.mode}.` },
        { status: 409 },
      );
    }
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
  const existingLinkedAccountId = decryptLinkedAccount(existing?.secretKeyCiphertext);
  const linkedAccountChanged = existingLinkedAccountId !== input.linkedAccountId;

  let existingWebhookSecret: string | null = null;
  if (existing?.webhookSecretCiphertext) {
    try {
      existingWebhookSecret = decryptSecret(existing.webhookSecretCiphertext);
    } catch {
      existingWebhookSecret = null;
    }
  }

  try {
    let webhookSecretCiphertext = existing?.webhookSecretCiphertext;
    let hasWebhookSecret = !isPendingLinkedWebhookSecret(existingWebhookSecret);
    let webhookCreated = false;
    let webhookId: string | null = null;

    if (input.webhookSecret) {
      webhookSecretCiphertext = encryptSecret(input.webhookSecret);
      hasWebhookSecret = true;
    } else if (input.isEnabled && (!hasWebhookSecret || linkedAccountChanged)) {
      if (!platform) {
        return NextResponse.json({ message: "PSP PayMongo platform configuration is unavailable." }, { status: 409 });
      }
      const createdWebhook = await createLinkedWebhook({
        secretKey: platform.secretKey,
        childAccountId: input.linkedAccountId,
        url: webhookUrl(chapter.code),
      });
      webhookSecretCiphertext = encryptSecret(createdWebhook.secret);
      hasWebhookSecret = true;
      webhookCreated = true;
      webhookId = createdWebhook.id;
    } else if (!input.isEnabled && (linkedAccountChanged || !webhookSecretCiphertext || !hasWebhookSecret)) {
      // Keep the production-compatible non-null column while representing a
      // deliberately staged configuration. Runtime payment code rejects this
      // encrypted marker and activation replaces it with the actual child
      // webhook signing secret.
      webhookSecretCiphertext = encryptSecret(PENDING_LINKED_WEBHOOK_SECRET);
      hasWebhookSecret = false;
    }

    if (!webhookSecretCiphertext) {
      return NextResponse.json({ message: "Unable to stage the chapter payment configuration safely." }, { status: 400 });
    }
    if (input.isEnabled && !hasWebhookSecret) {
      return NextResponse.json({ message: "Chapter webhook signing is not ready; online payment remains disabled." }, { status: 409 });
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
            configurationState: input.isEnabled ? "ENABLED" : "DRAFT",
          },
        },
      });
      return saved;
    });

    const currentPlatform = getPlatformStatus();
    const readiness = readinessFor({
      hasConfig: true,
      isEnabled: config.isEnabled,
      mode: config.mode,
      linkedAccountId: input.linkedAccountId,
      hasWebhookSecret,
      platform: currentPlatform,
    });

    return NextResponse.json(
      {
        config: {
          mode: config.mode,
          linkedAccountId: input.linkedAccountId,
          isEnabled: config.isEnabled,
          paymentMethods: config.paymentMethods,
          hasWebhookSecret,
        },
        webhookUrl: webhookUrl(chapter.code),
        webhookCreated,
        platformReady: currentPlatform.ready,
        platformMode: currentPlatform.mode,
        platformMessage: currentPlatform.message,
        liveGloballyEnabled: process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true",
        ...readiness,
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
