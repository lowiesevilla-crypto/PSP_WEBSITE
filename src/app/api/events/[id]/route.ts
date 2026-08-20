import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { notifyAllActiveMembers, notifyChapterMembers } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  venue: z.string().trim().max(300).optional().nullable(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ message: "Event not found." }, { status: 404 });
    if (!hasPermission(context, "events.manage", event.chapterId)) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid event update." }, { status: 400 });

    const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : event.startsAt;
    const endsAt = parsed.data.endsAt === undefined
      ? event.endsAt
      : parsed.data.endsAt
        ? new Date(parsed.data.endsAt)
        : null;
    if (endsAt && endsAt <= startsAt) return NextResponse.json({ message: "Event end time must be after the start time." }, { status: 400 });

    const newStatus = parsed.data.status ?? event.status;
    const updated = await prisma.$transaction(async (tx) => {
      const value = await tx.event.update({
        where: { id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          venue: parsed.data.venue,
          startsAt,
          endsAt,
          status: newStatus,
          isPublished: newStatus === "PUBLISHED" || newStatus === "COMPLETED",
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: event.chapterId,
          action: "EVENT_UPDATED",
          entityType: "Event",
          entityId: event.id,
          beforeJson: { status: event.status, title: event.title, startsAt: event.startsAt.toISOString() },
          afterJson: { status: value.status, title: value.title, startsAt: value.startsAt.toISOString() },
        },
      });
      return value;
    });

    if (event.status !== "PUBLISHED" && updated.status === "PUBLISHED") {
      const notification = { type: "EVENT" as const, title: "New PSP event", body: updated.title, href: "/events" };
      if (event.chapterId) await notifyChapterMembers({ chapterId: event.chapterId, ...notification });
      else await notifyAllActiveMembers(notification);
    }

    if (updated.status === "CANCELLED" && event.status !== "CANCELLED") {
      const notification = { type: "EVENT" as const, title: "PSP event cancelled", body: updated.title, href: "/events" };
      if (event.chapterId) await notifyChapterMembers({ chapterId: event.chapterId, ...notification });
      else await notifyAllActiveMembers(notification);
    }

    return NextResponse.json({ event: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Event update error", error);
    return NextResponse.json({ message: "Unable to update event." }, { status: 500 });
  }
}
