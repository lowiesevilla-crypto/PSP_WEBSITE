import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PASSKEY_CHALLENGE_COOKIE,
  passkeyChallengeCookieOptions,
  passkeyRelyingParty,
  verifyPasskeyChallengeToken,
} from "@/lib/auth/passkeys";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]["response"];

export async function POST(request: Request) {
  try {
    const { context } = await requireCurrentMember();
    const cookieStore = await cookies();
    const challenge = verifyPasskeyChallengeToken(
      cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value,
      "passkey-registration",
    );
    if (!challenge || challenge.userId !== context.user.id) {
      return NextResponse.json({ message: "Passkey setup expired. Please try again." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as RegistrationResponse | null;
    if (!body?.id) {
      return NextResponse.json({ message: "Invalid passkey response." }, { status: 400 });
    }

    const duplicate = await prisma.passkeyCredential.findUnique({
      where: { credentialId: body.id },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ message: "This passkey is already registered." }, { status: 409 });
    }

    const rp = passkeyRelyingParty();
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ message: "Passkey verification failed." }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const created = await prisma.$transaction(async (tx) => {
      const passkey = await tx.passkeyCredential.create({
        data: {
          userId: context.user.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: BigInt(credential.counter),
          transports: credential.transports ?? [],
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          name: "My Passkey",
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: context.user.member?.chapterId ?? null,
          action: "PASSKEY_REGISTERED",
          entityType: "PasskeyCredential",
          entityId: passkey.id,
          metadataJson: {
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
          },
        },
      });
      return passkey;
    });

    const response = NextResponse.json(
      { verified: true, passkey: { id: created.id, name: created.name } },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(PASSKEY_CHALLENGE_COOKIE, "", {
      ...passkeyChallengeCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Passkey registration verification error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Unable to verify passkey." }, { status: 400 });
  }
}
