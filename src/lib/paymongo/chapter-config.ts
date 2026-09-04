import { decryptSecret } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";

export type ChapterPayMongoRuntimeConfig = {
  chapterId: string;
  chapterCode: string;
  mode: "TEST" | "LIVE";
  accountId: string;
  webhookSecret: string;
  paymentMethods: string[];
};

function normalizeMethods(value: unknown) {
  if (!Array.isArray(value)) return ["qrph"];
  const allowed = new Set(["qrph", "gcash", "paymaya"]);
  const methods = value
    .filter((item): item is string => typeof item === "string" && allowed.has(item.trim()))
    .map((item) => item.trim());
  return methods.length ? Array.from(new Set(methods)) : ["qrph"];
}

export async function getChapterPayMongoConfig(chapterId: string): Promise<ChapterPayMongoRuntimeConfig> {
  const config = await prisma.chapterPaymentConfig.findUnique({
    where: { chapterId },
    include: { chapter: { select: { code: true } } },
  });
  if (!config || !config.isEnabled || config.gateway !== "PAYMONGO") {
    throw new Error("Online payment is not configured for this chapter.");
  }

  // The legacy-named secretKeyCiphertext column is intentionally retained for
  // additive production compatibility. In linked-account mode it stores the
  // encrypted PayMongo child Account-Id (org_*), never a chapter API secret.
  const accountId = decryptSecret(config.secretKeyCiphertext);
  const webhookSecret = decryptSecret(config.webhookSecretCiphertext);
  if (!accountId.startsWith("org_")) {
    throw new Error("Chapter PayMongo linked account id is invalid.");
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
