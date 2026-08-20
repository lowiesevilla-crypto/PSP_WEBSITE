import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";

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
    orderBy: { issuedAt: "desc" },
  });
  const valid = certificates.find((certificate) => certificate.status === "VALID");

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Official Document</p>
          <h1>Membership Certificate</h1>
        </div>

        <section className="app-panel" style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" style={{ width: 74, height: 74, objectFit: "contain" }} />
            <div style={{ flex: 1 }}>
              <small style={{ color: "#746b5b", fontWeight: 800 }}>ACTIVE MEMBER</small>
              <h2 style={{ margin: "5px 0" }}>{member.firstName} {member.lastName}</h2>
              <p style={{ margin: 0, color: "#6b665c" }}>{member.membershipNo} · {member.chapter.name}</p>
            </div>
          </div>

          {valid ? (
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid #e7dfce" }}>
              <strong>{valid.certificateNumber}</strong>
              <p style={{ color: "#6b665c" }}>Issued {valid.issuedAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="btn btn-primary" href={`/api/member/certificates/${valid.id}/pdf`}>Download PDF</a>
                <Link className="btn" href={`/verify/${valid.verificationToken}`} style={{ border: "1px solid #ddd5c1", background: "white" }}>Verify Certificate</Link>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 22 }}>
              <p style={{ color: "#6b665c", lineHeight: 1.6 }}>No valid certificate has been issued yet. Use the button below to issue your current digital membership certificate.</p>
              <form action="/api/member/certificates" method="post">
                <button className="btn btn-primary" type="submit">Issue My Certificate</button>
              </form>
              <p style={{ fontSize: ".82rem", color: "#746b5b" }}>If your browser displays the API result, return here and refresh. The certificate is created only once while a valid certificate exists.</p>
            </div>
          )}

          {certificates.some((certificate) => certificate.status !== "VALID") && (
            <div style={{ marginTop: 24 }}>
              <h3>History</h3>
              {certificates.filter((certificate) => certificate.status !== "VALID").map((certificate) => (
                <div key={certificate.id} style={{ padding: "12px 0", borderTop: "1px solid #eee5d4" }}>
                  <strong>{certificate.certificateNumber}</strong>
                  <span style={{ marginLeft: 8, fontSize: ".8rem" }}>{certificate.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
