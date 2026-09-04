import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  PASSKEY_CHALLENGE_COOKIE,
  passkeyChallengeCookieOptions,
  passkeyRelyingParty,
  verifyPasskeyChallengeToken,
} from "@/lib/auth/passkeys";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]["response"];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const challenge = verifyPasskeyChallengeToken(
      cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value,
      "passkey-authentication",
    );
    if (!challenge) {
      return NextResponse.json({ message: "Passkey sign-in expired. Please try again." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as AuthenticationResponse | null;
    if (!body?.id) {
      return NextResponse.json({ message: "Invalid passkey response." }, { status: 400 });
    }

    const passkey = await prisma.passkeyCredential.findUnique({
      where: { credentialId: body.id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
            passwordHash: true,
            member: { select: { chapterId: true } },
          },
        },
      },
    });
    if (!passkey || passkey.user.status !== "ACTIVE" || !passkey.user.emailVerifiedAt || !passkey.user.passwordHash) {
      return NextResponse.json({ message: "Passkey is unavailable for this account." }, { status: 401 });
    }

    const rp = passkeyRelyingParty();
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: Number(passkey.counter),
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ message: "Passkey verification failed." }, { status: 401 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.passkeyCredential.update({
        where: { id: passkey.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: now,
        },
      }),
      prisma.user.update({
        where: { id: passkey.user.id },
        data: { lastLoginAt: now },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: passkey.user.id,
          chapterId: passkey.user.member?.chapterId ?? null,
          action: "AUTH_PASSKEY_LOGIN_SUCCEEDED",
          entityType: "User",
          entityId: passkey.user.id,
          metadataJson: { passkeyId: passkey.id },
        },
      }),
    ]);

    const token = createSessionToken(passkey.user.id, passkey.user.passwordHash);
    const response = NextResponse.json(
      {
        verified: true,
        user: { id: passkey.user.id, displayName: passkey.user.displayName },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    response.cookies.set(PASSKEY_CHALLENGE_COOKIE, "", {
      ...passkeyChallengeCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Passkey authentication verification error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Passkey sign-in failed. Use your password or try again." }, { status: 401 });
  }
}
