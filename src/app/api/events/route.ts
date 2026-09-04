import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { contentMediaUrl, privateMediaReference } from "@/lib/content/media";
import { notifyAllActiveMembers, notifyChapterMembers } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { removePrivateFile, savePrivateImage } from "@/lib/storage/private-media";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  chapterId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  venue: z.string().trim().max(300).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  publish: z.boolean().default(false),
});

function normalizedDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context?.user.member || context.user.member.membershipStatus !== "ACTIVE") {
      return NextResponse.json({ message: "Active member authentication required." }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { audience: "NATIONAL" },
          { audience: "CHAPTER", chapterId: context.user.member.chapterId },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 100,
      include: { chapter: { select: { id: true, code: true, name: true } } },
    });

    return NextResponse.json(
      {
        events: events.map((item) => ({
          ...item,
          imageUrl: contentMediaUrl("event", item.id, item.imageUrl),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Event feed error", error);
    return NextResponse.json({ message: "Unable to load events." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let savedKey: string | null = null;
  let created = false;

  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";
    let raw: unknown;
    let imageFile: File | null = null;

    if (contentType.toLowerCase().startsWith("multipart/form-data")) {
      const form = await request.formData();
      raw = {
        chapterId: String(form.get("chapterId") ?? "").trim() || null,
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        venue: String(form.get("venue") ?? "").trim() || null,
        startsAt: normalizedDate(form.get("startsAt")) ?? "",
        endsAt: normalizedDate(form.get("endsAt")),
        publish: form.get("publish") === "on" || form.get("publish") === "true",
      };
      const candidate = form.get("image");
      imageFile = candidate instanceof File && candidate.size > 0 ? candidate : null;
    } else {
      raw = await request.json().catch(() => null);
    }

    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the event information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const chapterId = input.chapterId ?? null;
    if (!hasPermission(context, "events.manage", chapterId)) {
      return NextResponse.json({ message: "Event management permission is required." }, { status: 403 });
    }

    if (chapterId) {
      const chapter = await prisma.chapters.findFirst({
        where: { id: chapterId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!chapter) return NextResponse.json({ message: "Selected chapter is unavailable." }, { status: 400 });
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      return NextResponse.json({ message: "Event end time must be after the start time." }, { status: 400 });
    }

    if (imageFile) {
      const stored = await savePrivateImage(imageFile, "event-images");
      savedKey = stored.key;
    }

    const event = await prisma.$transaction(async (tx) => {
      const value = await tx.event.create({
        data: {
          chapterId,
          audience: chapterId ? "CHAPTER" : "NATIONAL",
          title: input.title,
          description: input.description,
          venue: input.venue || null,
          startsAt,
          endsAt,
          imageUrl: savedKey ? privateMediaReference(savedKey) : null,
          isPublished: input.publish,
          status: input.publish ? "PUBLISHED" : "DRAFT",
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId,
          action: input.publish ? "EVENT_CREATED_PUBLISHED" : "EVENT_CREATED_DRAFT",
          entityType: "Event",
          entityId: value.id,
          metadataJson: { hasImage: Boolean(savedKey) },
        },
      });
      return value;
    });
    created = true;

    if (input.publish) {
      const notification = {
        type: "EVENT" as const,
        title: "New PSP event",
        body: event.title,
        href: "/events",
      };
      try {
        if (chapterId) await notifyChapterMembers({ chapterId, ...notification });
        else await notifyAllActiveMembers(notification);
      } catch (notificationError) {
        console.error("Event notification error", notificationError);
      }
    }

    return NextResponse.json(
      {
        event: {
          ...event,
          imageUrl: contentMediaUrl("event", event.id, event.imageUrl),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (savedKey && !created) await removePrivateFile(savedKey);
    console.error("Event creation error", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create event." },
      { status: 500 },
    );
  }
}
