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

    const { kind, id } = await params;
    let imageUrl: string | null = null;
    let publicAllowed = false;
    let memberAllowed = false;
    let adminAllowed = false;

    if (kind === "announcement") {
      const item = await prisma.announcement.findUnique({
        where: { id },
        select: { audience: true, chapterId: true, imageUrl: true, startsAt: true, expiresAt: true, isPublic: true },
      });
      if (!item) return NextResponse.json({ message: "Image not found." }, { status: 404 });
      imageUrl = item.imageUrl;
      const now = new Date();
      const active = (!item.startsAt || item.startsAt <= now) && (!item.expiresAt || item.expiresAt > now);
      publicAllowed = Boolean(active && item.isPublic);
      memberAllowed = Boolean(
        context &&
        active &&
        context.user.member?.membershipStatus === "ACTIVE" &&
        (item.audience === "NATIONAL" || context.user.member.chapterId === item.chapterId),
      );
      adminAllowed = context && item.chapterId
        ? hasPermission(context, "content.manage", item.chapterId)
        : Boolean(context && hasPermission(context, "content.manage", null));
    } else if (kind === "event") {
      const item = await prisma.event.findUnique({
        where: { id },
        select: { audience: true, chapterId: true, imageUrl: true, status: true, isPublished: true, startsAt: true, endsAt: true },
      });
      if (!item) return NextResponse.json({ message: "Image not found." }, { status: 404 });
      imageUrl = item.imageUrl;
      const now = new Date();
      const active = item.endsAt ? item.endsAt > now : item.startsAt >= now;
      publicAllowed = Boolean(item.isPublished && item.status === "PUBLISHED" && active);
      memberAllowed = Boolean(
        context &&
        item.status === "PUBLISHED" &&
        context.user.member?.membershipStatus === "ACTIVE" &&
        (item.audience === "NATIONAL" || context.user.member.chapterId === item.chapterId),
      );
      adminAllowed = context && item.chapterId
        ? hasPermission(context, "events.manage", item.chapterId)
        : Boolean(context && hasPermission(context, "events.manage", null));
    } else {
      return NextResponse.json({ message: "Image not found." }, { status: 404 });
    }

    if (!publicAllowed && !memberAllowed && !adminAllowed) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    const storageKey = privateMediaStorageKey(imageUrl);
    if (!storageKey) return NextResponse.json({ message: "Image not found." }, { status: 404 });
    const bytes = await readPrivateFile(storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": mimeTypeFromStorageKey(storageKey),
        "Content-Length": String(bytes.length),
        "Cache-Control": publicAllowed ? "public, max-age=300" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Content media error", error);
    return NextResponse.json({ message: "Image is unavailable." }, { status: 404 });
  }
}
