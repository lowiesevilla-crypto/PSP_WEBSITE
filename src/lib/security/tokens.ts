import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface SignedTokenPayload {
  purpose: "session" | "email-verification" | "password-reset";
  userId: string;
  email?: string;
  passwordFingerprint?: string;
  expiresAt: number;
  issuedAt: number;
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function signature(data: string) {
  return createHmac("sha256", authSecret()).update(data).digest("base64url");
}

export function passwordFingerprint(passwordHash: string | null | undefined) {
  if (!passwordHash) return null;
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 24);
}

export function signToken(payload: SignedTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyToken(token: string, purpose: SignedTokenPayload["purpose"]) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;

  const expectedSignature = signature(encoded);
  const expectedBuffer = Buffer.from(expectedSignature);
  const suppliedBuffer = Buffer.from(suppliedSignature);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SignedTokenPayload;

    if (payload.purpose !== purpose) return null;
    if (!payload.userId || !payload.expiresAt || !payload.issuedAt) return null;
    if (payload.expiresAt <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
