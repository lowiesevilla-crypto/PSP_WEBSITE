import {
  passwordFingerprint,
  signToken,
  verifyToken,
} from "@/lib/security/tokens";

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export function createActivationToken(user: {
  id: string;
  email: string;
}) {
  const now = Date.now();
  return signToken({
    purpose: "email-verification",
    userId: user.id,
    email: user.email,
    issuedAt: now,
    expiresAt: now + ACTIVATION_TTL_MS,
  });
}

export function verifyActivationToken(token: string) {
  return verifyToken(token, "email-verification");
}

export function createPasswordResetToken(user: {
  id: string;
  email: string;
  passwordHash: string | null;
}) {
  const now = Date.now();
  return signToken({
    purpose: "password-reset",
    userId: user.id,
    email: user.email,
    passwordFingerprint: passwordFingerprint(user.passwordHash) ?? undefined,
    issuedAt: now,
    expiresAt: now + PASSWORD_RESET_TTL_MS,
  });
}

export function verifyPasswordResetToken(token: string) {
  return verifyToken(token, "password-reset");
}

export function applicationUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  return new URL(path, base).toString();
}
