import { NextResponse } from "next/server";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { readPrivateFile } from "@/lib/storage/private-media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const { id } = await params;
    const image = await prisma.postImage.findUnique({
      where: { id },
      include: {
        post: {
          select: { audience: true, chapterId: true, isHidden: true },
        },
      },
    });

    if (!image || image.post.isHidden) {
      return NextResponse.json({ message: "Image not found." }, { status: 404 });
    }

    let allowed = image.post.audience === "NATIONAL";
    if (!allowed && image.post.chapterId) {
      allowed =
        context.user.member?.chapterId === image.post.chapterId ||
        hasPermission(context, "content.manage", image.post.chapterId);
    }

    if (!allowed) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    const bytes = await readPrivateFile(image.storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Community media error", error);
    return NextResponse.json({ message: "Image is unavailable." }, { status: 404 });
  }
}
