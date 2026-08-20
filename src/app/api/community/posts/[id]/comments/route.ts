import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentMember } from "@/lib/member/current-member";
import { notifyUser } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";

const commentSchema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { context, member } = await requireCurrentMember();
    const { id } = await params;
    const parsed = commentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Comment is required and must not exceed 1,000 characters." }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorUserId: true, chapterId: true, audience: true, isHidden: true },
    });
    if (!post || post.isHidden) return NextResponse.json({ message: "Post not found." }, { status: 404 });

    if (post.audience === "CHAPTER" && post.chapterId !== member.chapterId) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: { postId: post.id, authorUserId: context.user.id, body: parsed.data.body },
      include: { author: { select: { id: true, displayName: true } } },
    });

    if (post.authorUserId !== context.user.id) {
      await notifyUser({
        userId: post.authorUserId,
        type: "COMMUNITY",
        title: "New comment on your post",
        body: `${context.user.displayName} commented on your PSP community post.`,
        href: "/community",
      });
    }

    return NextResponse.json({ comment }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Community comment error", error);
    return NextResponse.json({ message: "Unable to add comment." }, { status: 500 });
  }
}
