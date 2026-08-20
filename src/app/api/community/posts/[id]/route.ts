import { NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission, requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { removePrivateFile } from "@/lib/storage/private-media";

const patchSchema = z.object({
  body: z.string().trim().min(1).max(5000).optional(),
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAuthContext();
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid post update." }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ message: "Post not found." }, { status: 404 });

    const isOwner = post.authorUserId === context.user.id;
    const canModerate = hasPermission(context, "content.manage", post.chapterId);
    if (!isOwner && !canModerate) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    if ((parsed.data.isHidden !== undefined || parsed.data.isPinned !== undefined) && !canModerate) {
      return NextResponse.json({ message: "Content moderation permission is required." }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const value = await tx.post.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: post.chapterId,
          action: canModerate && !isOwner ? "COMMUNITY_POST_MODERATED" : "COMMUNITY_POST_UPDATED",
          entityType: "Post",
          entityId: post.id,
          beforeJson: { body: post.body, isHidden: post.isHidden, isPinned: post.isPinned },
          afterJson: { body: value.body, isHidden: value.isHidden, isPinned: value.isPinned },
        },
      });
      return value;
    });

    return NextResponse.json({ post: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Post update error", error);
    return NextResponse.json({ message: "Unable to update post." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAuthContext();
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { images: { select: { storageKey: true } } },
    });
    if (!post) return NextResponse.json({ message: "Post not found." }, { status: 404 });

    const isOwner = post.authorUserId === context.user.id;
    const canModerate = hasPermission(context, "content.manage", post.chapterId);
    if (!isOwner && !canModerate) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: post.chapterId,
          action: "COMMUNITY_POST_DELETED",
          entityType: "Post",
          entityId: post.id,
          beforeJson: { body: post.body, audience: post.audience, imageCount: post.images.length },
        },
      });
      await tx.post.delete({ where: { id: post.id } });
    });

    await Promise.all(post.images.map((image) => removePrivateFile(image.storageKey)));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Post delete error", error);
    return NextResponse.json({ message: "Unable to delete post." }, { status: 500 });
  }
}
