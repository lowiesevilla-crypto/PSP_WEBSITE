import { NextResponse } from "next/server";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { mimeTypeFromStorageKey, privateMediaStorageKey } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/storage/private-media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const { kind, id } = await params;
    let imageUrl: string | null = null;
    let memberAllowed = false;
    let adminAllowed = false;

    if (kind === "announcement") {
      const item = await prisma.announcement.findUnique({
        where: { id },
        select: { audience: true, chapterId: true, imageUrl: true, startsAt: true, expiresAt: true },
      });
      if (!item) return NextResponse.json({ message: "Image not found." }, { status: 404 });
      imageUrl = item.imageUrl;
      const now = new Date();
      const active = (!item.startsAt || item.startsAt <= now) && (!item.expiresAt || item.expiresAt > now);
      memberAllowed = Boolean(
        active &&
        context.user.member?.membershipStatus === "ACTIVE" &&
        (item.audience === "NATIONAL" || context.user.member.chapterId === item.chapterId),
      );
      adminAllowed = item.chapterId
        ? hasPermission(context, "content.manage", item.chapterId)
        : hasPermission(context, "content.manage", null);
    } else if (kind === "event") {
      const item = await prisma.event.findUnique({
        where: { id },
        select: { audience: true, chapterId: true, imageUrl: true, status: true },
      });
      if (!item) return NextResponse.json({ message: "Image not found." }, { status: 404 });
      imageUrl = item.imageUrl;
      memberAllowed = Boolean(
        item.status === "PUBLISHED" &&
        context.user.member?.membershipStatus === "ACTIVE" &&
        (item.audience === "NATIONAL" || context.user.member.chapterId === item.chapterId),
      );
      adminAllowed = item.chapterId
        ? hasPermission(context, "events.manage", item.chapterId)
        : hasPermission(context, "events.manage", null);
    } else {
      return NextResponse.json({ message: "Image not found." }, { status: 404 });
    }

    if (!memberAllowed && !adminAllowed) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    const storageKey = privateMediaStorageKey(imageUrl);
    if (!storageKey) return NextResponse.json({ message: "Image not found." }, { status: 404 });
    const bytes = await readPrivateFile(storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": mimeTypeFromStorageKey(storageKey),
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Content media error", error);
    return NextResponse.json({ message: "Image is unavailable." }, { status: 404 });
  }
}
