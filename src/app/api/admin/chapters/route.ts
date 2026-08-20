import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizedChapterIds,
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  getAuthContext,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional(),
  foundingDate: z.string().trim().optional(),
  address: z.string().trim().max(1000).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: z.string().trim().max(50).optional(),
});

export async function GET() {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const scope = authorizedChapterIds(context, "chapters.view");
  if (scope !== null && scope.length === 0) {
    return NextResponse.json({ message: "Permission denied." }, { status: 403 });
  }

  const chapters = await prisma.chapters.findMany({
    where: scope === null ? undefined : { id: { in: scope } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      foundingDate: true,
      email: true,
      phone: true,
      _count: {
        select: {
          members: true,
          applications: true,
        },
      },
    },
  });

  return NextResponse.json({ chapters }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("chapters.manage", null);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the chapter information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const organization = await prisma.organization.findUnique({ where: { code: "PSP_PH" } });
    if (!organization) {
      return NextResponse.json(
        { message: "PSP organization baseline is not initialized. Run the seed process." },
        { status: 503 },
      );
    }

    const existing = await prisma.chapters.findUnique({ where: { code: input.code } });
    if (existing) {
      return NextResponse.json({ message: "Chapter code already exists." }, { status: 409 });
    }

    const foundingDate = input.foundingDate
      ? new Date(`${input.foundingDate}T00:00:00.000Z`)
      : undefined;
    if (foundingDate && Number.isNaN(foundingDate.getTime())) {
      return NextResponse.json({ message: "Founding date is invalid." }, { status: 400 });
    }

    const chapter = await prisma.$transaction(async (tx) => {
      const created = await tx.chapters.create({
        data: {
          organizationId: organization.id,
          code: input.code,
          name: input.name,
          description: input.description || undefined,
          foundingDate,
          address: input.address || undefined,
          email: input.email || undefined,
          phone: input.phone || undefined,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: created.id,
          action: "CHAPTER_CREATED",
          entityType: "Chapter",
          entityId: created.id,
          afterJson: {
            code: created.code,
            name: created.name,
            status: created.status,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ chapter }, { status: 201, headers: { "Cache-Control": "no-store" } });
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
