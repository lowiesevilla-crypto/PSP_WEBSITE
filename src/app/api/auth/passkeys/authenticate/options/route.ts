import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import {
  createPasskeyChallengeToken,
  PASSKEY_CHALLENGE_COOKIE,
  passkeyChallengeCookieOptions,
  passkeyRelyingParty,
} from "@/lib/auth/passkeys";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const rp = passkeyRelyingParty();
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      userVerification: "required",
    });

    const response = NextResponse.json(options, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set(
      PASSKEY_CHALLENGE_COOKIE,
      createPasskeyChallengeToken({
        challenge: options.challenge,
        userId: "anonymous",
        purpose: "passkey-authentication",
      }),
      passkeyChallengeCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("Passkey authentication options error", error);
    return NextResponse.json({ message: "Unable to start passkey sign-in." }, { status: 500 });
  }
}
