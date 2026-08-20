import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const VERSION = "scrypt-v1";
const KEY_LENGTH = 64;
const N = 32768;
const R = 8;
const P = 1;
const MAX_MEM = 64 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const SCRYPT_OPTIONS = {
  N,
  r: R,
  p: P,
  maxmem: MAX_MEM,
};

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

export function validatePasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

export async function hashPassword(password: string) {
  const policyError = validatePasswordPolicy(password);
  if (policyError) throw new Error(policyError);

  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    VERSION,
    N,
    R,
    P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== VERSION) return false;

  const [, nText, rText, pText, saltText, hashText] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);

  if (![n, r, p].every(Number.isFinite)) return false;

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const actual = await deriveKey(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEM,
    });

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
