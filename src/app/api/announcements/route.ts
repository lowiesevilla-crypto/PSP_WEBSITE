import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";
import { notifyAllActiveMembers, notifyChapterMembers } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

const announcementSchema = z.object({
  audience: z.enum(["CHAPTER", "NATIONAL"]),
  chapterId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const { member } = await requireCurrentMember();
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [{ audience: "NATIONAL" }, { audience: "CHAPTER", chapterId: member.chapterId }],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({ announcements }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Announcement list error", error);
    return NextResponse.json({ message: "Unable to load announcements." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = announcementSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid announcement details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    const input = parsed.data;
    const chapterId = input.audience === "CHAPTER" ? input.chapterId : null;
    if (input.audience === "CHAPTER") {
      if (!chapterId || !hasPermission(context, "content.manage", chapterId)) {
        return NextResponse.json({ message: "You cannot publish for this chapter." }, { status: 403 });
      }
    } else {
      const canPublishNational = context.assignments.some((assignment) => assignment.chapterId === null && assignment.permissions.includes("content.manage"));
      if (!canPublishNational) return NextResponse.json({ message: "National announcement permission required." }, { status: 403 });
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) return NextResponse.json({ message: "Expiration must be after the start time." }, { status: 400 });

    const announcement = await prisma.announcement.create({
      data: { chapterId, audience: input.audience, title: input.title, body: input.body, startsAt, expiresAt, isPinned: input.isPinned },
    });
    await prisma.auditLog.create({
      data: { actorUserId: context.user.id, chapterId, action: "ANNOUNCEMENT_CREATED", entityType: "Announcement", entityId: announcement.id, metadataJson: { audience: input.audience, title: input.title } },
    });

    if (!startsAt || startsAt <= new Date()) {
      if (chapterId) await notifyChapterMembers({ chapterId, type: "GENERAL", title: input.title, body: input.body.slice(0, 280), href: "/announcements" });
      else await notifyAllActiveMembers({ type: "GENERAL", title: input.title, body: input.body.slice(0, 280), href: "/announcements" });
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Announcement creation error", error);
    return NextResponse.json({ message: "Unable to create announcement." }, { status: 500 });
  }
}
