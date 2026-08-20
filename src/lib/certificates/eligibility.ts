import { getMemberBalance } from "@/lib/finance/ledger";

export function certificateRequiresCurrentDues() {
  return (process.env.CERTIFICATE_REQUIRE_CURRENT_DUES ?? "false").trim().toLowerCase() === "true";
}

export async function checkCertificateEligibility(member: { id: string; membershipStatus: string }) {
  if (member.membershipStatus !== "ACTIVE") {
    return { eligible: false as const, reason: "Only active members can receive a membership certificate." };
  }

  if (!certificateRequiresCurrentDues()) {
    return { eligible: true as const, balance: null };
  }

  const balance = await getMemberBalance(member.id);
  if (balance.greaterThan(0)) {
    return {
      eligible: false as const,
      reason: "Your chapter currently requires dues to be current before certificate issuance.",
      balance,
    };
  }

  return { eligible: true as const, balance };
}
