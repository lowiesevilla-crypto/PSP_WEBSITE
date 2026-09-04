import { NextResponse } from "next/server";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { context, member } = await requireCurrentMember();
    const { id } = await params;
    const passkey = await prisma.passkeyCredential.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!passkey || passkey.userId !== context.user.id) {
      return NextResponse.json({ message: "Passkey not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.passkeyCredential.delete({ where: { id: passkey.id } }),
      prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "PASSKEY_REVOKED",
          entityType: "PasskeyCredential",
          entityId: passkey.id,
        },
      }),
    ]);

    return NextResponse.json({ removed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: "Unable to remove passkey." }, { status: 500 });
  }
}
