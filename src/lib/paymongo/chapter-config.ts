import { decryptSecret } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";

export type ChapterPayMongoRuntimeConfig = {
  chapterId: string;
  chapterCode: string;
  mode: "TEST" | "LIVE";
  secretKey: string;
  webhookSecret: string;
  paymentMethods: string[];
};

function normalizeMethods(value: unknown) {
  if (!Array.isArray(value)) return ["qrph"];
  const methods = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return methods.length ? Array.from(new Set(methods)) : ["qrph"];
}

function liveEnabled() {
  return process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true";
}

function validateModeKey(mode: "TEST" | "LIVE", secretKey: string) {
  if (mode === "LIVE") {
    if (!secretKey.startsWith("sk_live_")) throw new Error("Chapter PayMongo LIVE configuration requires a live secret key.");
    if (!liveEnabled()) throw new Error("PayMongo live processing is disabled pending test-mode signoff and explicit approval.");
  } else if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Chapter PayMongo TEST configuration requires a test secret key.");
  }
}

export async function getChapterPayMongoConfig(chapterId: string): Promise<ChapterPayMongoRuntimeConfig> {
  const config = await prisma.chapterPaymentConfig.findUnique({
    where: { chapterId },
    include: { chapter: { select: { code: true } } },
  });
  if (!config || !config.isEnabled || config.gateway !== "PAYMONGO") {
    throw new Error("Online payment is not configured for this chapter.");
  }

  const mode = config.mode === "LIVE" ? "LIVE" : "TEST";
  const secretKey = decryptSecret(config.secretKeyCiphertext);
  const webhookSecret = decryptSecret(config.webhookSecretCiphertext);
  validateModeKey(mode, secretKey);

  return {
    chapterId: config.chapterId,
    chapterCode: config.chapter.code,
    mode,
    secretKey,
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
