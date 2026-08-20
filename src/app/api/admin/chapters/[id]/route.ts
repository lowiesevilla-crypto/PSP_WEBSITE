import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(191).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const context = await requirePermission("chapters.manage", id);
    const existing = await prisma.chapters.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the chapter information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const chapter = await tx.chapters.update({
        where: { id },
        data: parsed.data,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: id,
          action: "CHAPTER_UPDATED",
          entityType: "Chapter",
          entityId: id,
          beforeJson: {
            name: existing.name,
            status: existing.status,
            email: existing.email,
            phone: existing.phone,
          },
          afterJson: {
            name: chapter.name,
            status: chapter.status,
            email: chapter.email,
            phone: chapter.phone,
          },
        },
      });

      return chapter;
    });

    return NextResponse.json({ chapter: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationDeniedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    throw error;
  }
}
