import { signToken, verifyToken, type SignedTokenPayload } from "@/lib/security/tokens";

export const PASSKEY_CHALLENGE_COOKIE = "psp_passkey_challenge";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type VerifiedPasskeyChallenge = Omit<SignedTokenPayload, "challenge"> & {
  challenge: string;
};

export function passkeyRelyingParty() {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(configured);
  return {
    rpName: "Psi Sigma Phi Philippines Inc.",
    rpID: url.hostname,
    origin: url.origin,
  };
}

export function passkeyChallengeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/auth/passkeys",
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
  };
}

export function createPasskeyChallengeToken(input: {
  challenge: string;
  userId: string;
  purpose: "passkey-registration" | "passkey-authentication";
}) {
  const now = Date.now();
  return signToken({
    purpose: input.purpose,
    userId: input.userId,
    challenge: input.challenge,
    issuedAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  });
}

export function verifyPasskeyChallengeToken(
  token: string | undefined,
  purpose: "passkey-registration" | "passkey-authentication",
): VerifiedPasskeyChallenge | null {
  if (!token) return null;
  const payload = verifyToken(token, purpose);
  if (!payload?.challenge) return null;
  return { ...payload, challenge: payload.challenge };
}
