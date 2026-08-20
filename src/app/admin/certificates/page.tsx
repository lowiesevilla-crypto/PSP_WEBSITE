import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { IssueCertificateButton, RevokeCertificateButton } from "@/components/admin/certificate-manager";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const scope = authorizedChapterIds(context, "certificates.manage");
  if (scope !== null && scope.length === 0) redirect("/admin");

  const [members, certificates] = await Promise.all([
    prisma.member.findMany({
      where: { membershipStatus: "ACTIVE", ...(scope === null ? {} : { chapterId: { in: scope } }) },
      orderBy: [{ chapter: { name: "asc" } }, { lastName: "asc" }],
      take: 300,
      include: { chapter: { select: { name: true } }, certificates: { where: { status: "VALID" }, select: { id: true } } },
    }),
    prisma.certificate.findMany({
      where: scope === null ? undefined : { chapterId: { in: scope } },
      orderBy: { issuedAt: "desc" },
      take: 300,
      include: { chapter: { select: { name: true } }, member: { select: { firstName: true, lastName: true, membershipNo: true } } },
    }),
  ]);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Official Documents</p><h1>Membership Certificates</h1></div>

        <section className="app-panel" style={{ overflowX: "auto" }}>
          <h2>Active Members</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead><tr><th align="left">Member</th><th align="left">Membership No.</th><th align="left">Chapter</th><th align="left">Certificate</th></tr></thead>
            <tbody>{members.map((member) => (
              <tr key={member.id} style={{ borderTop: "1px solid #eee5d4" }}>
                <td>{member.firstName} {member.lastName}</td>
                <td>{member.membershipNo}</td>
                <td>{member.chapter.name}</td>
                <td>{member.certificates.length ? "Valid certificate exists" : <IssueCertificateButton memberId={member.id} />}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className="app-panel" style={{ marginTop: 18, overflowX: "auto" }}>
          <h2>Certificate Register</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead><tr><th align="left">Certificate No.</th><th align="left">Member</th><th align="left">Chapter</th><th align="left">Issued</th><th align="left">Status</th><th align="left">Actions</th></tr></thead>
            <tbody>{certificates.map((certificate) => (
              <tr key={certificate.id} style={{ borderTop: "1px solid #eee5d4" }}>
                <td>{certificate.certificateNumber}</td>
                <td>{certificate.member.membershipNo} · {certificate.member.firstName} {certificate.member.lastName}</td>
                <td>{certificate.chapter.name}</td>
                <td>{certificate.issuedAt.toLocaleDateString("en-PH")}</td>
                <td>{certificate.status}</td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="btn" href={`/api/member/certificates/${certificate.id}/pdf`} style={{ border: "1px solid #ddd5c1", background: "white" }}>PDF</a>
                  <a className="btn" href={`/verify/${certificate.verificationToken}`} style={{ border: "1px solid #ddd5c1", background: "white" }}>Verify</a>
                  {certificate.status === "VALID" && <RevokeCertificateButton certificateId={certificate.id} />}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
