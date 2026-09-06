import { decryptSecret } from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";
import { isPendingLinkedWebhookSecret, PENDING_LINKED_WEBHOOK_SECRET } from "@/lib/paymongo/chapter-config-state";

export type ChapterPayMongoRuntimeConfig = {
  chapterId: string;
  chapterCode: string;
  mode: "TEST" | "LIVE";
  accountId: string;
  webhookSecret: string;
  paymentMethods: string[];
};

export type ChapterPayMongoReadiness = {
  ready: boolean;
  chapterId: string;
  chapterCode: string | null;
  mode: "TEST" | "LIVE" | null;
  methods: string[];
  reasonCode: "READY" | "CHAPTER_NOT_FOUND" | "CHAPTER_DISABLED" | "LINKED_ACCOUNT_INVALID" | "WEBHOOK_NOT_READY" | "MODE_MISMATCH" | "PLATFORM_NOT_READY" | "UNKNOWN";
  message: string | null;
};

function normalizeMethods(value: unknown) {
  if (!Array.isArray(value)) return ["qrph"];
  const allowed = new Set(["qrph", "gcash", "paymaya"]);
  const methods = value
    .filter((item): item is string => typeof item === "string" && allowed.has(item.trim()))
    .map((item) => item.trim());
  return methods.length ? Array.from(new Set(methods)) : ["qrph"];
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

function safeReadinessFailure(error: unknown): Pick<ChapterPayMongoReadiness, "reasonCode" | "message"> {
  const text = error instanceof Error ? error.message : "";
  if (text.includes("Online payment is not configured")) {
    return {
      reasonCode: "CHAPTER_DISABLED",
      message: "Online Payment is disabled or no enabled PayMongo configuration exists for this exact member Chapter.",
    };
  }
  if (text.includes("linked account id is invalid")) {
    return {
      reasonCode: "LINKED_ACCOUNT_INVALID",
      message: "This Chapter does not have a valid saved PayMongo linked child Account ID.",
    };
  }
  if (text.includes("child webhook is not configured")) {
    return {
      reasonCode: "WEBHOOK_NOT_READY",
      message: "This Chapter's PayMongo child webhook signing configuration is not ready.",
    };
  }
  if (text.includes("does not match the PSP platform PayMongo mode")) {
    return {
      reasonCode: "MODE_MISMATCH",
      message: "This Chapter's PayMongo mode does not match the PSP platform payment mode.",
    };
  }
  if (text.includes("PayMongo") || text.includes("platform") || text.includes("convenience fee")) {
    return {
      reasonCode: "PLATFORM_NOT_READY",
      message: "The PSP platform online-payment service is not ready for new provider actions. National Administration must review the LIVE/payment readiness controls.",
    };
  }
  return {
    reasonCode: "UNKNOWN",
    message: "Online Payment readiness could not be confirmed for this exact member Chapter. Please contact the Chapter Administrator.",
  };
}

export async function getChapterPayMongoReadiness(chapterId: string): Promise<ChapterPayMongoReadiness> {
  const chapter = await prisma.chapters.findUnique({ where: { id: chapterId }, select: { code: true } });
  if (!chapter) {
    return {
      ready: false,
      chapterId,
      chapterCode: null,
      mode: null,
      methods: [],
      reasonCode: "CHAPTER_NOT_FOUND",
      message: "The member Chapter record could not be found.",
    };
  }
  try {
    const config = await getChapterPayMongoConfig(chapterId);
    return {
      ready: true,
      chapterId,
      chapterCode: config.chapterCode,
      mode: config.mode,
      methods: config.paymentMethods,
      reasonCode: "READY",
      message: null,
    };
  } catch (error) {
    const failure = safeReadinessFailure(error);
    return {
      ready: false,
      chapterId,
      chapterCode: chapter.code,
      mode: null,
      methods: [],
      ...failure,
    };
  }
}

export async function getChapterPayMongoConfigByCode(chapterCode: string): Promise<ChapterPayMongoRuntimeConfig> {
  const chapter = await prisma.chapters.findUnique({
    where: { code: chapterCode },
    select: { id: true },
  });
  if (!chapter) throw new Error("Chapter payment configuration was not found.");
  return getChapterPayMongoConfig(chapter.id);
}
