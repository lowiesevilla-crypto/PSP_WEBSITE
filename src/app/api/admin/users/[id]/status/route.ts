import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const context = await requirePermission("roles.manage", null);
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, displayName: true, email: true, status: true },
    });
    if (!target) return NextResponse.json({ message: "User not found." }, { status: 404 });

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Invalid user status." }, { status: 400 });
    if (target.id === context.user.id && parsed.data.status !== "ACTIVE") {
      return NextResponse.json({ message: "You cannot deactivate or suspend your own current National Admin account." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { status: parsed.data.status } });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          action: "USER_STATUS_UPDATED",
          entityType: "User",
          entityId: id,
          beforeJson: { status: target.status },
          afterJson: { status: user.status },
        },
      });
      return user;
    });

    return NextResponse.json({ user: { id: updated.id, displayName: updated.displayName, email: updated.email, status: updated.status } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ message: error.message }, { status: 401 });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ message: error.message }, { status: 403 });
    console.error("User status update error", error);
    return NextResponse.json({ message: "Unable to update user status." }, { status: 500 });
  }
}
