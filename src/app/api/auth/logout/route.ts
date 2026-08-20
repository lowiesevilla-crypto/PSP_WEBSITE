import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();

  if (user) {
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "AUTH_LOGOUT",
        entityType: "User",
        entityId: user.id,
      },
    });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
