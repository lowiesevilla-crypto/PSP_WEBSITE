import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password";
import {
  enforceRateLimit,
  rateLimitIdentifier,
  RateLimitExceededError,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !appUrl) return true;
  try {
    return origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid login request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const identifier = rateLimitIdentifier("login-email", email);

  try {
    await enforceRateLimit({
      action: "AUTH_LOGIN_FAILED",
      identifier,
      maxAttempts: 5,
      windowSeconds: 15 * 60,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { message: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      passwordHash: true,
      emailVerifiedAt: true,
    },
  });

  const passwordValid = Boolean(
    user?.passwordHash && (await verifyPassword(password, user.passwordHash)),
  );

  if (
    !user ||
    !passwordValid ||
    user.status !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.passwordHash
  ) {
    await recordRateLimitAttempt("AUTH_LOGIN_FAILED", identifier, {
      reason: "INVALID_OR_INACTIVE_CREDENTIALS",
    });

    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = createSessionToken(user.id, user.passwordHash);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "AUTH_LOGIN_SUCCEEDED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        displayName: user.displayName,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
