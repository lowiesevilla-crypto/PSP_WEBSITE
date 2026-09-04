const PRIVATE_PREFIX = "private:";

export type ContentMediaKind = "announcement" | "event";

export function privateMediaReference(storageKey: string) {
  return `${PRIVATE_PREFIX}${storageKey}`;
}

export function privateMediaStorageKey(value: string | null | undefined) {
  if (!value?.startsWith(PRIVATE_PREFIX)) return null;
  const key = value.slice(PRIVATE_PREFIX.length);
  return key || null;
}

export function contentMediaUrl(kind: ContentMediaKind, id: string, imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  return privateMediaStorageKey(imageUrl)
    ? `/api/content-media/${kind}/${encodeURIComponent(id)}`
    : imageUrl;
}

export function mimeTypeFromStorageKey(storageKey: string) {
  const lower = storageKey.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
