import { NextResponse } from "next/server";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { chapterLogoPublicPath } from "@/lib/chapter/logo";
import { privateMediaReference, privateMediaStorageKey } from "@/lib/content/media";
import { prisma } from "@/lib/prisma";
import { removePrivateFile, savePrivateImage } from "@/lib/storage/private-media";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chapter = await prisma.chapters.findUnique({
    where: { id },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!chapter) {
    return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("content.manage", chapter.id);
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Select a JPG, PNG, or WEBP chapter logo." }, { status: 400 });
    }

    let saved: Awaited<ReturnType<typeof savePrivateImage>>;
    try {
      saved = await savePrivateImage(file, "chapter-logos");
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unable to validate chapter logo." },
        { status: 400 },
      );
    }

    const nextLogoUrl = privateMediaReference(saved.key);
    const previousKey = privateMediaStorageKey(chapter.logoUrl);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.chapters.update({
          where: { id: chapter.id },
          data: { logoUrl: nextLogoUrl },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: chapter.id,
            action: "CHAPTER_LOGO_UPDATED",
            entityType: "Chapter",
            entityId: chapter.id,
            metadataJson: {
              mimeType: saved.mimeType,
              sizeBytes: saved.sizeBytes,
            },
          },
        });
      });
    } catch (error) {
      await removePrivateFile(saved.key);
      throw error;
    }

    if (previousKey && previousKey !== saved.key) {
      await removePrivateFile(previousKey);
    }

    return NextResponse.json(
      {
        message: `${chapter.name} logo updated. PSP emails will use this logo automatically.`,
        logoUrl: chapterLogoPublicPath(chapter.id, nextLogoUrl),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const chapter = await prisma.chapters.findUnique({
    where: { id },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!chapter) {
    return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("content.manage", chapter.id);
    const previousKey = privateMediaStorageKey(chapter.logoUrl);

    await prisma.$transaction(async (tx) => {
      await tx.chapters.update({ where: { id: chapter.id }, data: { logoUrl: null } });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: chapter.id,
          action: "CHAPTER_LOGO_REMOVED",
          entityType: "Chapter",
          entityId: chapter.id,
        },
      });
    });

    if (previousKey) await removePrivateFile(previousKey);

    return NextResponse.json(
      {
        message: `${chapter.name} will use the official PSP logo.`,
        logoUrl: "/brand/psp-logo.jpg",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
