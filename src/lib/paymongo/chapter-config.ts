import { decryptSecret } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";
import type { LinkedPaymentMethod } from "@/lib/paymongo/client";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";
import { isPendingLinkedWebhookSecret, PENDING_LINKED_WEBHOOK_SECRET } from "@/lib/paymongo/chapter-config-state";

export type ChapterPayMongoRuntimeConfig = {
  chapterId: string;
  chapterCode: string;
  mode: "TEST" | "LIVE";
  accountId: string;
  webhookSecret: string;
  paymentMethods: LinkedPaymentMethod[];
};

function normalizeMethods(value: unknown) {
  if (!Array.isArray(value)) return ["qrph"] satisfies LinkedPaymentMethod[];
  const allowed = new Set<LinkedPaymentMethod>(["qrph", "gcash", "paymaya"]);
  const methods = value
    .filter((item): item is LinkedPaymentMethod => typeof item === "string" && allowed.has(item.trim() as LinkedPaymentMethod))
    .map((item) => item.trim() as LinkedPaymentMethod);
  return methods.length ? Array.from(new Set(methods)) : ["qrph"] satisfies LinkedPaymentMethod[];
}

function linkedAccountFromStorage(value: string) {
  const direct = value.trim();
  if (direct.startsWith("org_")) return direct;
  return decryptSecret(value);
}

function webhookSecretFromStorage(value: string) {
  if (value === PENDING_LINKED_WEBHOOK_SECRET) return value;
  return decryptSecret(value);
}

export async function getChapterPayMongoConfig(chapterId: string): Promise<ChapterPayMongoRuntimeConfig> {
  const config = await prisma.chapterPaymentConfig.findUnique({
    where: { chapterId },
    include: { chapter: { select: { code: true } } },
  });
  if (!config || !config.isEnabled || config.gateway !== "PAYMONGO") {
    throw new Error("Online payment is not configured for this chapter.");
  }

  // The legacy-named secretKeyCiphertext column is retained for additive
  // production compatibility. In linked-account mode it stores only the
  // PayMongo child Account ID (org_*), which is a non-secret identifier. Older
  // encrypted identifiers remain readable during the compatibility window.
  const accountId = linkedAccountFromStorage(config.secretKeyCiphertext);
  const webhookSecret = webhookSecretFromStorage(config.webhookSecretCiphertext);
  if (!accountId.startsWith("org_")) {
    throw new Error("Chapter PayMongo linked account id is invalid.");
  }
  if (isPendingLinkedWebhookSecret(webhookSecret)) {
    throw new Error("Chapter PayMongo child webhook is not configured yet.");
  }

  const mode = config.mode === "LIVE" ? "LIVE" : "TEST";
  const platform = getPlatformPayMongoConfig();
  if (platform.mode !== mode) {
    throw new Error(`Chapter PayMongo mode ${mode} does not match the PSP platform PayMongo mode ${platform.mode}.`);
  }

  return {
    chapterId: config.chapterId,
    chapterCode: config.chapter.code,
    mode,
    accountId,
    webhookSecret,
    paymentMethods: normalizeMethods(config.paymentMethods),
  };
}

export async function getChapterPayMongoConfigByCode(chapterCode: string): Promise<ChapterPayMongoRuntimeConfig> {
  const chapter = await prisma.chapters.findUnique({
    where: { code: chapterCode },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter payment configuration was not found.");
  return getChapterPayMongoConfig(chapter.id);
}
