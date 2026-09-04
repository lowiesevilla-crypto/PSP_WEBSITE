import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify PSP Digital ID" };

export default async function VerifyDigitalMemberIdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const digitalId = await prisma.digitalMemberId.findUnique({
    where: { verificationToken: token },
    include: {
      member: {
        select: {
          firstName: true,
          middleInitial: true,
          lastName: true,
          membershipNo: true,
          membershipStatus: true,
          chapter: { select: { name: true } },
        },
      },
    },
  });

  if (!digitalId) {
    return <VerificationShell status="NOT FOUND" valid={false} />;
  }

  const valid = digitalId.status === "VALID" && digitalId.member.membershipStatus === "ACTIVE";
  const memberName = [digitalId.member.firstName, digitalId.member.middleInitial, digitalId.member.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 680 }}>
        <section className="app-panel" style={{ margin: "40px auto", textAlign: "center" }}>
          <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 92, height: 92, objectFit: "contain" }} />
          <p style={{ fontWeight: 900, letterSpacing: ".08em", color: valid ? "#267a3f" : "#9b2c2c" }}>
            {valid ? "VERIFIED · ACTIVE MEMBER" : "VERIFIED · NOT ACTIVE"}
          </p>
          <h1>PSP Digital Member ID</h1>
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(120px,.45fr) 1fr", gap: "12px 18px", marginTop: 24, textAlign: "left" }}>
            <dt>Member</dt><dd style={{ margin: 0, fontWeight: 800 }}>{memberName}</dd>
            <dt>Membership No.</dt><dd style={{ margin: 0 }}>{digitalId.member.membershipNo}</dd>
            <dt>Chapter</dt><dd style={{ margin: 0 }}>{digitalId.member.chapter.name}</dd>
            <dt>Status</dt><dd style={{ margin: 0, fontWeight: 900 }}>{digitalId.member.membershipStatus}</dd>
            <dt>ID Issued</dt><dd style={{ margin: 0 }}>{digitalId.issuedAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</dd>
          </dl>
          <p style={{ marginTop: 24, color: "#746b5b", fontSize: ".82rem", lineHeight: 1.55 }}>
            This page intentionally displays only the minimum information necessary to verify PSP membership identity.
          </p>
        </section>
      </div>
    </main>
  );
}

function VerificationShell({ status, valid }: { status: string; valid: boolean }) {
  return (
    <main className="app-shell">
      <div className="container app-main" style={{ maxWidth: 620 }}>
        <section className="app-panel" style={{ margin: "40px auto", textAlign: "center" }}>
          <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 82, height: 82, objectFit: "contain" }} />
          <p style={{ color: valid ? "#267a3f" : "#9b2c2c", fontWeight: 900 }}>{status}</p>
          <h1>Digital Member ID Verification</h1>
          <p style={{ color: "#6b665c" }}>This verification code is not recognized as a current PSP digital member ID.</p>
          <Link href="/" className="btn btn-primary">Return Home</Link>
        </section>
      </div>
    </main>
  );
}
