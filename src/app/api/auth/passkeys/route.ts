import { NextResponse } from "next/server";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { context } = await requireCurrentMember();
    const passkeys = await prisma.passkeyCredential.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return NextResponse.json({ passkeys }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: "Unable to load passkeys." }, { status: 500 });
  }
}
