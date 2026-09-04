import { NextResponse } from "next/server";
import { mimeTypeFromStorageKey, privateMediaStorageKey } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/storage/private-media";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chapter = await prisma.chapters.findUnique({
    where: { id },
    select: { logoUrl: true },
  });

  const storageKey = privateMediaStorageKey(chapter?.logoUrl);
  if (!storageKey) {
    return NextResponse.redirect(new URL("/brand/psp-logo.jpg", request.url), 307);
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
    return NextResponse.redirect(new URL("/brand/psp-logo.jpg", request.url), 307);
  }
}
