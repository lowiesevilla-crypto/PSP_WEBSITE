import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";
import { CertificateAction } from "@/components/certificates/certificate-action";

export const dynamic = "force-dynamic";

export default async function CertificatePage() {
  let memberContext;
  try {
    memberContext = await requireCurrentMember();
  } catch {
    redirect("/login");
  }
  const { member } = memberContext;

  const certificates = await prisma.certificate.findMany({
    where: { memberId: member.id },
    orderBy: [{ certificateDate: "desc" }, { issuedAt: "desc" }],
  });
  const validCertificates = certificates.filter((certificate) => certificate.status === "VALID");
  const validMembership = validCertificates.find((certificate) => certificate.certificateType === "MEMBERSHIP");
  const history = certificates.filter((certificate) => certificate.status !== "VALID");

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Official Documents</p>
          <h1>My Certificates</h1>
          <p style={{ marginTop: 8, maxWidth: 720, color: "#746b5b", lineHeight: 1.55 }}>
            Download and verify every certificate issued to your membership. Attendance, Appreciation, Recognition and other Chapter certificates appear here automatically after assignment.
          </p>
        </div>

        <section className="app-panel" style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 74, height: 74, objectFit: "contain" }} />
            <div style={{ flex: 1 }}>
              <small style={{ color: "#746b5b", fontWeight: 800 }}>ACTIVE MEMBER</small>
              <h2 style={{ margin: "5px 0" }}>{member.firstName} {member.lastName}</h2>
              <p style={{ margin: 0, color: "#6b665c" }}>{member.membershipNo} · {member.chapter.name}</p>
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid #e7dfce" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <small style={{ color: "#806500", fontWeight: 900 }}>AVAILABLE DOWNLOADS</small>
                <h3 style={{ margin: "4px 0 0" }}>Valid Certificates</h3>
              </div>
              <span style={{ padding: "6px 9px", borderRadius: 999, background: "#f7f4ec", fontWeight: 900, fontSize: ".78rem" }}>{validCertificates.length} VALID</span>
            </div>

            {validCertificates.length ? (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {validCertificates.map((certificate) => (
                  <article key={certificate.id} style={{ border: "1px solid #e4ddcf", borderRadius: 14, padding: 14, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div>
                        <small style={{ color: "#806500", fontWeight: 900 }}>{certificate.certificateType.replaceAll("_", " ")}</small>
                        <h3 style={{ margin: "4px 0 3px" }}>{certificate.title}</h3>
                        <div style={{ color: "#6b665c", fontSize: ".88rem" }}>{certificate.certificateNumber}</div>
                        <div style={{ color: "#6b665c", fontSize: ".84rem", marginTop: 4 }}>
                          Certificate date: {certificate.certificateDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}
                          {certificate.referenceLabel ? ` · ${certificate.referenceLabel}` : ""}
                        </div>
                      </div>
                      <span style={{ padding: "6px 9px", borderRadius: 999, background: "#eaf7ec", color: "#245b2a", fontWeight: 900, fontSize: ".75rem" }}>VALID</span>
                    </div>
                    {certificate.citationText ? <p style={{ color: "#665b47", lineHeight: 1.5, margin: "12px 0 0" }}>{certificate.citationText}</p> : null}
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 13 }}>
                      <a className="btn btn-primary" href={`/api/member/certificates/${certificate.id}/pdf`}>Download PDF</a>
                      <Link className="btn" href={`/verify/${certificate.verificationToken}`} style={{ border: "1px solid #ddd5c1", background: "white" }}>Verify Certificate</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ color: "#6b665c", lineHeight: 1.6 }}>No valid certificates have been issued to your account yet.</p>
            )}
          </div>

          {!validMembership ? (
            <div style={{ marginTop: 22, padding: 14, borderRadius: 14, background: "#fff9e8", border: "1px solid #ead79c" }}>
              <strong>Membership Certificate</strong>
              <p style={{ color: "#6b665c", lineHeight: 1.55 }}>You do not currently have a valid Membership Certificate. If you meet the current issuance rules, you can generate the official membership certificate below. Other Chapter certificates do not block this action.</p>
              <CertificateAction />
            </div>
          ) : null}

          {history.length ? (
            <div style={{ marginTop: 24 }}>
              <h3>Certificate History</h3>
              {history.map((certificate) => (
                <div key={certificate.id} style={{ padding: "12px 0", borderTop: "1px solid #eee5d4" }}>
                  <strong>{certificate.title}</strong>
                  <span style={{ marginLeft: 8, fontSize: ".8rem" }}>{certificate.status}</span>
                  <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{certificate.certificateNumber} · {certificate.certificateType.replaceAll("_", " ")}</small>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
