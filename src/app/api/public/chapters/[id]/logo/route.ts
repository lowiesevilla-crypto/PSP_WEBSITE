import { NextResponse } from "next/server";
import { applicationUrl } from "@/lib/auth/account-tokens";
import { mimeTypeFromStorageKey, privateMediaStorageKey } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/storage/private-media";

function nationalLogoRedirect() {
  return NextResponse.redirect(applicationUrl("/brand/psp-logo.jpg"), 307);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chapter = await prisma.chapters.findUnique({
    where: { id },
    select: { logoUrl: true },
  });

  const storageKey = privateMediaStorageKey(chapter?.logoUrl);
  if (!storageKey) {
    return nationalLogoRedirect();
  }

  try {
    const body = await readPrivateFile(storageKey);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mimeTypeFromStorageKey(storageKey),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return nationalLogoRedirect();
  }
}
