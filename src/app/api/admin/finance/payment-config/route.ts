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

function paymentEncryptionReady() {
  return (process.env.PAYMENT_CONFIG_ENCRYPTION_KEY?.trim().length ?? 0) >= 32;
}

function platformSetupSummary() {
  const secret = process.env.PAYMONGO_PLATFORM_SECRET_KEY?.trim() ?? "";
  const account = process.env.PAYMONGO_PLATFORM_ACCOUNT_ID?.trim() ?? "";
  const bps = Number(process.env.PLATFORM_CONVENIENCE_FEE_BPS?.trim() ?? "0");
  const fixed = Number(process.env.PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS?.trim() ?? "0");
  const detectedMode = secret.startsWith("sk_live_") ? "LIVE" : secret.startsWith("sk_test_") ? "TEST" : null;
  return {
    parentAccountConfigured: account.startsWith("org_"),
    parentSecretConfigured: detectedMode !== null,
    feeConfigured: (Number.isInteger(bps) && bps > 0) || (Number.isInteger(fixed) && fixed > 0),
    encryptionReady: paymentEncryptionReady(),
    detectedMode,
    liveEnabled: process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true",
  };
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

// PayMongo org_* account IDs are identifiers, not secret credentials. Existing
// encrypted values remain readable for backward compatibility, while new draft
// saves store the identifier directly so a disabled draft does not depend on a
// server encryption key that is only required for actual signing secrets.
function linkedAccountFromStorage(value: string | null | undefined) {
  if (!value) return null;
  const direct = value.trim();
  if (direct.startsWith("org_")) return direct;
  try {
    const decrypted = decryptSecret(value);
    return decrypted.startsWith("org_") ? decrypted : null;
  } catch {
    return null;
  }
}

function webhookSecretFromStorage(value: string | null | undefined) {
  if (!value || value === PENDING_LINKED_WEBHOOK_SECRET) return null;
  try {
    const decrypted = decryptSecret(value);
    return isPendingLinkedWebhookSecret(decrypted) ? null : decrypted;
  } catch {
    return null;
  }
}

function hasStoredWebhookSecret(value: string | null | undefined) {
  return Boolean(webhookSecretFromStorage(value));
}

function readinessFor(input: {
  hasConfig: boolean;
  isEnabled: boolean;
  mode: string | null | undefined;
  linkedAccountId: string | null;
  hasWebhookSecret: boolean;
  platform: PlatformStatus;
  encryptionReady: boolean;
}) {
  const activationBlockers: string[] = [];
  if (!input.linkedAccountId) activationBlockers.push("Save a valid PayMongo linked child Account ID (org_*).");
  if (!input.encryptionReady) {
    activationBlockers.push("Server payment credential encryption is not configured. Configure PAYMENT_CONFIG_ENCRYPTION_KEY with at least 32 characters before activation.");
  }
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

  const linkedAccountId = linkedAccountFromStorage(chapter.paymentConfig?.secretKeyCiphertext);
  const hasWebhookSecret = hasStoredWebhookSecret(chapter.paymentConfig?.webhookSecretCiphertext);
  const platform = getPlatformStatus();
  const setup = platformSetupSummary();
  const readiness = readinessFor({
    hasConfig: Boolean(chapter.paymentConfig),
    isEnabled: Boolean(chapter.paymentConfig?.isEnabled),
    mode: chapter.paymentConfig?.mode,
    linkedAccountId,
    hasWebhookSecret,
    platform,
    encryptionReady: setup.encryptionReady,
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
      platformMode: platform.mode ?? setup.detectedMode,
      platformMessage: platform.message,
      paymentEncryptionReady: setup.encryptionReady,
      platformConfiguration: setup,
      liveGloballyEnabled: setup.liveEnabled,
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
    if (!paymentEncryptionReady()) {
      return NextResponse.json(
        { message: "Chapter setup can be saved as a disabled draft, but online payment cannot be enabled until PAYMENT_CONFIG_ENCRYPTION_KEY is configured with at least 32 characters." },
        { status: 409 },
      );
    }
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

  // The linked PayMongo child Account ID is non-secret. Compare the normalized
  // identifier directly, while retaining compatibility with legacy encrypted
  // values already in production.
  const otherChapterConfigs = await prisma.chapterPaymentConfig.findMany({
    where: { chapterId: { not: chapter.id } },
    select: { secretKeyCiphertext: true },
  });
  for (const otherConfig of otherChapterConfigs) {
    if (linkedAccountFromStorage(otherConfig.secretKeyCiphertext) === input.linkedAccountId) {
      return NextResponse.json(
        { message: "This PayMongo linked account is already assigned to another PSP chapter." },
        { status: 409 },
      );
    }
  }

  const existing = await prisma.chapterPaymentConfig.findUnique({ where: { chapterId: chapter.id } });
  const existingLinkedAccountId = linkedAccountFromStorage(existing?.secretKeyCiphertext);
  const linkedAccountChanged = existingLinkedAccountId !== input.linkedAccountId;
  const existingWebhookSecret = webhookSecretFromStorage(existing?.webhookSecretCiphertext);

  try {
    let webhookSecretCiphertext = existing?.webhookSecretCiphertext;
    let hasWebhookSecret = Boolean(existingWebhookSecret);
    let webhookCreated = false;
    let webhookId: string | null = null;

    if (input.webhookSecret) {
      if (!paymentEncryptionReady()) {
        return NextResponse.json({ message: "PAYMENT_CONFIG_ENCRYPTION_KEY must be configured before storing a webhook signing secret." }, { status: 409 });
      }
      webhookSecretCiphertext = encryptSecret(input.webhookSecret);
      hasWebhookSecret = true;
    } else if (input.isEnabled && (!hasWebhookSecret || linkedAccountChanged)) {
      // Encryption readiness is checked before the provider call so a missing
      // server key can never create an orphan PayMongo child webhook whose
      // signing secret cannot be persisted safely.
      if (!paymentEncryptionReady()) {
        return NextResponse.json({ message: "PAYMENT_CONFIG_ENCRYPTION_KEY must be configured before activating a Chapter PayMongo webhook." }, { status: 409 });
      }
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
    } else if (!input.isEnabled && (linkedAccountChanged || !webhookSecretCiphertext)) {
      // A disabled draft has no signing secret yet. The plain marker is not a
      // credential and keeps the existing non-null production column while
      // allowing draft staging before server credential encryption is ready.
      webhookSecretCiphertext = PENDING_LINKED_WEBHOOK_SECRET;
      hasWebhookSecret = false;
    }

    if (!webhookSecretCiphertext) {
      return NextResponse.json({ message: "Unable to stage the chapter payment configuration safely." }, { status: 400 });
    }
    if (input.isEnabled && !hasWebhookSecret) {
      return NextResponse.json({ message: "Chapter webhook signing is not ready; online payment remains disabled." }, { status: 409 });
    }

    const config = await prisma.$transaction(async (tx) => {
      const saved = await tx.chapterPaymentConfig.upsert({
        where: { chapterId: chapter.id },
        create: {
          chapterId: chapter.id,
          gateway: "PAYMONGO",
          mode: input.mode,
          secretKeyCiphertext: input.linkedAccountId,
          webhookSecretCiphertext,
          paymentMethods: input.paymentMethods,
          isEnabled: input.isEnabled,
        },
        update: {
          mode: input.mode,
          secretKeyCiphertext: input.linkedAccountId,
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
    const setup = platformSetupSummary();
    const readiness = readinessFor({
      hasConfig: true,
      isEnabled: config.isEnabled,
      mode: config.mode,
      linkedAccountId: input.linkedAccountId,
      hasWebhookSecret,
      platform: currentPlatform,
      encryptionReady: setup.encryptionReady,
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
        platformMode: currentPlatform.mode ?? setup.detectedMode,
        platformMessage: currentPlatform.message,
        paymentEncryptionReady: setup.encryptionReady,
        platformConfiguration: setup,
        liveGloballyEnabled: setup.liveEnabled,
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
