import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/context";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";
import { removePrivateFile, savePrivateImage } from "@/lib/storage/private-media";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { member } = await requireCurrentMember();
    const posts = await prisma.post.findMany({
      where: {
        isHidden: false,
        OR: [
          { audience: "NATIONAL" },
          { audience: "CHAPTER", chapterId: member.chapterId },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        author: { select: { id: true, displayName: true } },
        chapter: { select: { id: true, code: true, name: true } },
        images: { select: { id: true, url: true, mimeType: true, sizeBytes: true } },
        comments: {
          where: { isHidden: false },
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { author: { select: { id: true, displayName: true } } },
        },
      },
    });

    return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Community feed error", error);
    return NextResponse.json({ message: "Unable to load community feed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const savedKeys: string[] = [];

  try {
    const { context, member } = await requireCurrentMember();
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json({ message: "Post submission must use multipart form data." }, { status: 415 });
    }

    const form = await request.formData();
    const body = String(form.get("body") ?? "").trim();
    const requestedAudience = String(form.get("audience") ?? "CHAPTER").toUpperCase();

    if (!body || body.length > 5000) {
      return NextResponse.json({ message: "Post text is required and must not exceed 5,000 characters." }, { status: 400 });
    }

    const canPostNational = hasPermission(context, "content.manage", null);
    const audience = requestedAudience === "NATIONAL" && canPostNational ? "NATIONAL" : "CHAPTER";
    if (requestedAudience === "NATIONAL" && !canPostNational) {
      return NextResponse.json({ message: "National posting permission is required." }, { status: 403 });
    }

    const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length > 4) {
      return NextResponse.json({ message: "A maximum of four images is allowed per post." }, { status: 400 });
    }

    const stored = [] as Array<{ key: string; mimeType: string; sizeBytes: number }>;
    for (const file of files) {
      const image = await savePrivateImage(file, "post-images");
      savedKeys.push(image.key);
      stored.push(image);
    }

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorUserId: context.user.id,
          chapterId: audience === "CHAPTER" ? member.chapterId : null,
          audience,
          body,
        },
      });

      for (const image of stored) {
        const record = await tx.postImage.create({
          data: {
            postId: created.id,
            storageKey: image.key,
            url: "",
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
          },
        });
        await tx.postImage.update({
          where: { id: record.id },
          data: { url: `/api/community/media/${record.id}` },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: audience === "CHAPTER" ? member.chapterId : null,
          action: "COMMUNITY_POST_CREATED",
          entityType: "Post",
          entityId: created.id,
          metadataJson: { audience, imageCount: stored.length },
        },
      });

      return created;
    });

    return NextResponse.json({ post }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await Promise.all(savedKeys.map((key) => removePrivateFile(key)));
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Community post error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create post." }, { status: 500 });
  }
}
