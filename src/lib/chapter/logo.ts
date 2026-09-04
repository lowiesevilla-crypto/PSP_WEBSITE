import { privateMediaStorageKey } from "@/lib/content/media";

export function chapterLogoPublicPath(chapterId: string, logoUrl: string | null | undefined) {
  if (!logoUrl) return "/brand/psp-logo.jpg";
  if (privateMediaStorageKey(logoUrl)) {
    return `/api/public/chapters/${encodeURIComponent(chapterId)}/logo`;
  }
  return logoUrl;
}
