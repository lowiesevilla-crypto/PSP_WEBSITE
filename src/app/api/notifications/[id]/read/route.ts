import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAuthContext();
    const { id } = await params;

    const result = await prisma.notification.updateMany({
      where: { id, userId: context.user.id },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthenticationRequiredError") {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    console.error("Notification read error", error);
    return NextResponse.json({ message: "Unable to update notification." }, { status: 500 });
  }
}
