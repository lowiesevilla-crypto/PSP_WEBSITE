import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import {
  createPasskeyChallengeToken,
  PASSKEY_CHALLENGE_COOKIE,
  passkeyChallengeCookieOptions,
  passkeyRelyingParty,
} from "@/lib/auth/passkeys";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { context } = await requireCurrentMember();
    const existing = await prisma.passkeyCredential.findMany({
      where: { userId: context.user.id },
      select: { credentialId: true },
    });
    const rp = passkeyRelyingParty();
    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userID: new TextEncoder().encode(context.user.id),
      userName: context.user.email,
      userDisplayName: context.user.displayName,
      attestationType: "none",
      excludeCredentials: existing.map((passkey) => ({ id: passkey.credentialId })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    const response = NextResponse.json(options, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set(
      PASSKEY_CHALLENGE_COOKIE,
      createPasskeyChallengeToken({
        challenge: options.challenge,
        userId: context.user.id,
        purpose: "passkey-registration",
      }),
      passkeyChallengeCookieOptions(),
    );
    return response;
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Passkey registration options error", error);
    return NextResponse.json({ message: "Unable to start passkey setup." }, { status: 500 });
  }
}
