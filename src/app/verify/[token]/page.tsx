import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    include: {
      chapter: { select: { name: true } },
      member: { select: { firstName: true, middleInitial: true, lastName: true, membershipNo: true } },
    },
  });

  if (!certificate) {
    return (
      <main className="app-shell">
        <div className="container app-main">
          <section className="app-panel" style={{ maxWidth: 620, margin: "40px auto", textAlign: "center" }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 82, height: 82, objectFit: "contain" }} />
            <h1>Certificate Not Found</h1>
            <p style={{ color: "#6b665c" }}>This verification code is not recognized by the Psi Sigma Phi Philippines digital platform.</p>
            <Link href="/" className="btn btn-primary">Return Home</Link>
          </section>
        </div>
      </main>
    );
  }

  const name = [certificate.member.firstName, certificate.member.middleInitial, certificate.member.lastName].filter(Boolean).join(" ");
  const valid = certificate.status === "VALID";

  return (
    <main className="app-shell">
      <div className="container app-main">
        <section className="app-panel" style={{ maxWidth: 680, margin: "40px auto" }}>
          <div style={{ textAlign: "center" }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 92, height: 92, objectFit: "contain" }} />
            <p style={{ fontWeight: 900, letterSpacing: ".08em", color: valid ? "#267a3f" : "#9b2c2c" }}>
              {valid ? "VERIFIED · VALID" : `VERIFIED · ${certificate.status}`}
            </p>
            <h1>Certificate of Membership</h1>
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(130px, .5fr) 1fr", gap: "12px 18px", marginTop: 24 }}>
            <dt>Member</dt><dd style={{ margin: 0, fontWeight: 800 }}>{name}</dd>
            <dt>Membership No.</dt><dd style={{ margin: 0 }}>{certificate.member.membershipNo}</dd>
            <dt>Chapter</dt><dd style={{ margin: 0 }}>{certificate.chapter.name}</dd>
            <dt>Certificate No.</dt><dd style={{ margin: 0 }}>{certificate.certificateNumber}</dd>
            <dt>Issued</dt><dd style={{ margin: 0 }}>{certificate.issuedAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</dd>
            <dt>Status</dt><dd style={{ margin: 0, fontWeight: 900 }}>{certificate.status}</dd>
          </dl>
          {!valid && certificate.revocationReason && (
            <p style={{ marginTop: 18, padding: 14, background: "#fff4f4", borderRadius: 12 }}><strong>Status note:</strong> {certificate.revocationReason}</p>
          )}
          <p style={{ marginTop: 24, fontSize: ".82rem", color: "#746b5b" }}>This page intentionally exposes only the minimum information needed to verify the certificate.</p>
        </section>
      </div>
    </main>
  );
}
