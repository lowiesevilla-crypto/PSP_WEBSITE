import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const secret = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("PAYMENT_CONFIG_ENCRYPTION_KEY must be configured with at least 32 characters.");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(value: string) {
  const plaintext = value.trim();
  if (!plaintext) throw new Error("Payment credential cannot be empty.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("Unsupported encrypted payment credential format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
