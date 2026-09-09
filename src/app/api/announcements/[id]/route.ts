import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
});

async function canManageAnnouncement(id: string) {
  const context = await getAuthContext();
  if (!context) return { error: NextResponse.json({ message: "Authentication required." }, { status: 401 }) };
  const announcement = await prisma.announcement.findUnique({ where: { id }, select: { id: true, chapterId: true } });
  if (!announcement) return { error: NextResponse.json({ message: "Announcement not found." }, { status: 404 }) };
  if (!hasPermission(context, "content.manage", announcement.chapterId)) {
    return { error: NextResponse.json({ message: "You cannot manage this announcement." }, { status: 403 }) };
  }
  return { context, announcement };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const permission = await canManageAnnouncement(id);
    if ("error" in permission) return permission.error;

    const parsed = updateAnnouncementSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid announcement details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    const input = parsed.data;
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) return NextResponse.json({ message: "Expiration must be after the start time." }, { status: 400 });

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        startsAt,
        expiresAt,
        isPinned: input.isPinned,
        isPublic: input.isPublic,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: permission.context.user.id,
        chapterId: permission.announcement.chapterId,
        action: "ANNOUNCEMENT_UPDATED",
        entityType: "Announcement",
        entityId: id,
        metadataJson: { title: input.title, isPublic: input.isPublic, expiresAt: input.expiresAt },
      },
    });
    return NextResponse.json({ announcement }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Announcement update error", error);
    return NextResponse.json({ message: "Unable to update announcement." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const permission = await canManageAnnouncement(id);
    if ("error" in permission) return permission.error;
    await prisma.announcement.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        actorUserId: permission.context.user.id,
        chapterId: permission.announcement.chapterId,
        action: "ANNOUNCEMENT_DELETED",
        entityType: "Announcement",
        entityId: id,
        metadataJson: {},
      },
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Announcement delete error", error);
    return NextResponse.json({ message: "Unable to delete announcement." }, { status: 500 });
  }
}
