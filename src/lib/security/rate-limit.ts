import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many attempts. Please try again later.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function rateLimitIdentifier(scope: string, value: string) {
  return createHash("sha256")
    .update(`${scope}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export async function enforceRateLimit(options: {
  action: string;
  identifier: string;
  maxAttempts: number;
  windowSeconds: number;
}) {
  const now = Date.now();
  const windowStart = new Date(now - options.windowSeconds * 1000);

  const attempts = await prisma.auditLog.count({
    where: {
      action: options.action,
      entityType: "RateLimit",
      entityId: options.identifier,
      createdAt: { gte: windowStart },
    },
  });

  if (attempts >= options.maxAttempts) {
    throw new RateLimitExceededError(options.windowSeconds);
  }
}

export async function recordRateLimitAttempt(
  action: string,
  identifier: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType: "RateLimit",
      entityId: identifier,
      metadataJson: metadata ?? undefined,
    },
  });
}
