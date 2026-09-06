import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    include: {
      chapter: { select: { id: true, name: true } },
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
    <main className="app-shell" data-certificate-verification-version="custom-metadata-v2">
      <div className="container app-main">
        <section className="app-panel" style={{ maxWidth: 680, margin: "40px auto" }}>
          <div style={{ textAlign: "center" }}>
            <img src={`/api/public/chapters/${encodeURIComponent(certificate.chapter.id)}/logo`} alt={`${certificate.chapter.name} logo`} style={{ width: 92, height: 92, objectFit: "contain" }} />
            <p style={{ fontWeight: 900, letterSpacing: ".08em", color: valid ? "#267a3f" : "#9b2c2c" }}>
              {valid ? "VERIFIED · VALID" : `INVALID · ${certificate.status}`}
            </p>
            <small style={{ color: "#806500", fontWeight: 900 }}>{certificate.certificateType.replaceAll("_", " ")}</small>
            <h1 style={{ marginTop: 5 }}>{certificate.title}</h1>
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(130px, .5fr) 1fr", gap: "12px 18px", marginTop: 24 }}>
            <dt>Member</dt><dd style={{ margin: 0, fontWeight: 800 }}>{name}</dd>
            <dt>Membership No.</dt><dd style={{ margin: 0 }}>{certificate.member.membershipNo}</dd>
            <dt>Chapter</dt><dd style={{ margin: 0 }}>{certificate.chapter.name}</dd>
            <dt>Certificate No.</dt><dd style={{ margin: 0 }}>{certificate.certificateNumber}</dd>
            <dt>Certificate Date</dt><dd style={{ margin: 0 }}>{certificate.certificateDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}</dd>
            {certificate.referenceLabel ? <><dt>Reference</dt><dd style={{ margin: 0 }}>{certificate.referenceLabel}</dd></> : null}
            <dt>Issued</dt><dd style={{ margin: 0 }}>{certificate.issuedAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}</dd>
            <dt>Signatory</dt><dd style={{ margin: 0 }}>{certificate.signatoryName ? `${certificate.signatoryName}${certificate.signatoryTitle ? ` · ${certificate.signatoryTitle}` : ""}` : "Chapter Chairman"}</dd>
            <dt>Status</dt><dd style={{ margin: 0, fontWeight: 900 }}>{certificate.status}</dd>
          </dl>
          {certificate.citationText ? (
            <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#f7f4ec", color: "#665b47", lineHeight: 1.55 }}>
              <strong>Citation</strong>
              <p style={{ margin: "6px 0 0" }}>{certificate.citationText}</p>
            </div>
          ) : null}
          {!valid ? (
            <div style={{ marginTop: 18, padding: 14, background: "#fff4f4", border: "1px solid #efc3c3", borderRadius: 12, color: "#7b2424" }}>
              <strong>This certificate is invalid and must not be accepted as an active PSP document.</strong>
              {certificate.revocationReason ? <p style={{ margin: "7px 0 0" }}>Reason: {certificate.revocationReason}</p> : null}
              {certificate.revokedAt ? <p style={{ margin: "5px 0 0" }}>Invalidated: {certificate.revokedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p> : null}
            </div>
          ) : null}
          <p style={{ marginTop: 24, fontSize: ".82rem", color: "#746b5b" }}>This page intentionally exposes only the minimum information needed to verify the issued certificate.</p>
        </section>
      </div>
    </main>
  );
}
