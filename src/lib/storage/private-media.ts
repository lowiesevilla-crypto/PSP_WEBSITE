import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function storageRoot() {
  const configuredRoot = process.env.STORAGE_ROOT;
  return configuredRoot
    ? path.resolve(/*turbopackIgnore: true*/ configuredRoot)
    : path.join(process.cwd(), "storage");
}

function maxBytes() {
  const configured = Number(process.env.MAX_IMAGE_UPLOAD_BYTES ?? DEFAULT_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_BYTES;
}

function detectImage(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export async function savePrivateImage(file: File, bucket = "post-images") {
  if (file.size <= 0 || file.size > maxBytes()) {
    throw new Error(`Image must be between 1 byte and ${Math.floor(maxBytes() / 1024 / 1024)} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(buffer);
  if (!detected) throw new Error("Only valid JPG, PNG, and WEBP images are accepted.");

  const safeBucket = bucket.replace(/[^a-z0-9-]/gi, "");
  if (!safeBucket) throw new Error("Invalid storage bucket.");

  const key = `${safeBucket}/${randomUUID()}.${detected.extension}`;
  const root = storageRoot();
  const absolute = path.resolve(root, key);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path.");

  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer, { flag: "wx" });

  return { key, mimeType: detected.mimeType, sizeBytes: buffer.length };
}

export async function readPrivateFile(storageKey: string) {
  const root = storageRoot();
  const absolute = path.resolve(root, storageKey);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path.");
  return readFile(/*turbopackIgnore: true*/ absolute);
}

export async function removePrivateFile(storageKey: string) {
  const root = storageRoot();
  const absolute = path.resolve(root, storageKey);
  if (!absolute.startsWith(`${root}${path.sep}`)) return;
  await unlink(absolute).catch(() => undefined);
}
