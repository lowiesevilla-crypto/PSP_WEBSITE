import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await requireAuthContext();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1";

    const notifications = await prisma.notification.findMany({
      where: { userId: context.user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ notifications }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    console.error("Notification feed error", error);
    return NextResponse.json({ message: "Unable to load notifications." }, { status: 500 });
  }
}
