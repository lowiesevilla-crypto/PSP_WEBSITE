import Link from "next/link";
import { CertificateStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { CustomCertificateIssuer } from "@/components/admin/custom-certificate-issuer";
import { RevokeCertificateButton } from "@/components/admin/certificate-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const certificateTypes = ["MEMBERSHIP", "ATTENDANCE", "APPRECIATION", "RECOGNITION", "OUTSTANDING_MEMBER", "CUSTOM"];
const certificateStatuses: CertificateStatus[] = ["VALID", "REVOKED", "SUPERSEDED", "EXPIRED"];

type SearchParams = Promise<{
  q?: string | string[];
  chapter?: string | string[];
  type?: string | string[];
  status?: string | string[];
  page?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminCertificatesPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const scope = authorizedChapterIds(context, "certificates.manage");
  if (scope !== null && scope.length === 0) redirect("/admin");

  const params = await searchParams;
  const q = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedChapter = (single(params.chapter) ?? "").trim();
  const requestedType = (single(params.type) ?? "").trim().toUpperCase();
  const requestedStatus = (single(params.status) ?? "").trim().toUpperCase();
  const requestedPage = parsePage(single(params.page));

  const chapters = await prisma.chapters.findMany({
    where: { status: "ACTIVE", ...(scope === null ? {} : { id: { in: scope } }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const chapterFilter = chapters.some((chapter) => chapter.id === requestedChapter) ? requestedChapter : "";
  const typeFilter = certificateTypes.includes(requestedType) ? requestedType : "";
  const statusFilter = certificateStatuses.includes(requestedStatus as CertificateStatus) ? requestedStatus as CertificateStatus : null;

  const where: Prisma.CertificateWhereInput = {
    ...(scope === null ? {} : { chapterId: { in: scope } }),
    ...(chapterFilter ? { chapterId: chapterFilter } : {}),
    ...(typeFilter ? { certificateType: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q ? {
      OR: [
        { certificateNumber: { contains: q } },
        { title: { contains: q } },
        { referenceLabel: { contains: q } },
        { member: { membershipNo: { contains: q } } },
        { member: { firstName: { contains: q } } },
        { member: { lastName: { contains: q } } },
        { chapter: { name: { contains: q } } },
        { chapter: { code: { contains: q } } },
      ],
    } : {}),
  };

  const totalItems = await prisma.certificate.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const [members, certificates] = await Promise.all([
    prisma.member.findMany({
      where: { membershipStatus: "ACTIVE", ...(scope === null ? {} : { chapterId: { in: scope } }) },
      orderBy: [{ chapter: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
      take: 2000,
      select: { id: true, chapterId: true, membershipNo: true, firstName: true, lastName: true },
    }),
    prisma.certificate.findMany({
      where,
      orderBy: [{ certificateDate: "desc" }, { issuedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        chapter: { select: { name: true, code: true } },
        member: { select: { firstName: true, lastName: true, membershipNo: true } },
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Official Documents</p>
            <h1>Certificate Management</h1>
            <p style={{ marginTop: 8, maxWidth: 760, color: "#746b5b", lineHeight: 1.55 }}>
              Create Chapter certificates in bulk, assign them to authorized members, and manage the complete QR-verifiable certificate register. Certificate records and revocations preserve issuance history.
            </p>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        <CustomCertificateIssuer chapters={chapters} members={members} />

        <section className="app-panel">
          <div style={{ marginBottom: 14 }}>
            <small style={{ color: "#806500", fontWeight: 900 }}>CERTIFICATE REGISTER</small>
            <h2 style={{ margin: "5px 0 0" }}>Issued Certificates</h2>
          </div>

          <form className="admin-list-toolbar" method="get" action="/admin/certificates">
            <label className="admin-search-field">Search<input name="q" defaultValue={q} placeholder="Certificate no., title, member, Chapter…" /></label>
            <label>Chapter<select name="chapter" defaultValue={chapterFilter}><option value="">All authorized Chapters</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}</select></label>
            <label>Type<select name="type" defaultValue={typeFilter}><option value="">All types</option>{certificateTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            <label>Status<select name="status" defaultValue={statusFilter ?? ""}><option value="">All statuses</option>{certificateStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <button className="btn btn-primary" type="submit">Search / Filter</button>
            <Link className="btn" href="/admin/certificates" style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 44 }}>Clear</Link>
          </form>

          {certificates.length ? (
            <div className="admin-table-wrap">
              <table className="admin-responsive-table">
                <thead><tr><th>Certificate</th><th>Member</th><th>Chapter</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{certificates.map((certificate) => (
                  <tr key={certificate.id}>
                    <td data-label="Certificate"><strong>{certificate.title}</strong><small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{certificate.certificateType.replaceAll("_", " ")} · {certificate.certificateNumber}</small>{certificate.referenceLabel ? <small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{certificate.referenceLabel}</small> : null}</td>
                    <td data-label="Member"><strong>{certificate.member.firstName} {certificate.member.lastName}</strong><small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{certificate.member.membershipNo}</small></td>
                    <td data-label="Chapter"><strong>{certificate.chapter.name}</strong><small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>{certificate.chapter.code}</small></td>
                    <td data-label="Date">{certificate.certificateDate.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}<small style={{ display: "block", color: "#746b5b", marginTop: 3 }}>Issued {certificate.issuedAt.toLocaleDateString("en-PH")}</small></td>
                    <td data-label="Status"><strong>{certificate.status}</strong></td>
                    <td data-label="Actions"><div className="admin-table-actions"><a className="btn" href={`/api/member/certificates/${certificate.id}/pdf`} style={{ border: "1px solid #ddd5c1", background: "white" }}>Download PDF</a><Link className="btn" href={`/verify/${certificate.verificationToken}`} style={{ border: "1px solid #ddd5c1", background: "white" }}>Verify</Link>{certificate.status === "VALID" ? <RevokeCertificateButton certificateId={certificate.id} /> : null}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p style={{ color: "#6b665c" }}>No certificates match the current search and filters.</p>}

          <AdminPagination pathname="/admin/certificates" page={page} totalPages={totalPages} totalItems={totalItems} query={{ q: q || undefined, chapter: chapterFilter || undefined, type: typeFilter || undefined, status: statusFilter ?? undefined }} />
        </section>
      </div>
    </main>
  );
}
