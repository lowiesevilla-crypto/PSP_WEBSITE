import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  getTemporaryPasswordUser,
  TEMPORARY_PASSWORD_COOKIE_NAME,
  temporaryPasswordCookieOptions,
} from "@/lib/auth/temporary-password";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security/password";

const schema = z.object({
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const user = await getTemporaryPasswordUser();
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { message: "Your temporary-password session has expired. Sign in again using the temporary password provided by your administrator." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid new password." }, { status: 400 });
  }

  if (await verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { message: "Your permanent password must be different from the temporary password." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(parsed.data.password);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Password does not meet requirements." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: user.emailVerifiedAt ?? now,
        lastLoginAt: now,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        chapterId: user.member?.chapterId ?? null,
        action: "AUTH_TEMPORARY_PASSWORD_REPLACED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  const response = NextResponse.json(
    { message: "Your permanent password is now set. Your account is active." },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id, passwordHash), sessionCookieOptions());
  response.cookies.set(TEMPORARY_PASSWORD_COOKIE_NAME, "", {
    ...temporaryPasswordCookieOptions(),
    maxAge: 0,
  });
  return response;
}
