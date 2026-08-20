import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { php } from "@/lib/finance/ledger";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const scope = authorizedChapterIds(context, "reports.view");
  if (scope !== null && scope.length === 0) redirect("/admin");

  const memberWhere = scope === null ? {} : { chapterId: { in: scope } };
  const paymentWhere = scope === null ? {} : { chapterId: { in: scope } };
  const applicationWhere = scope === null ? {} : { chapterId: { in: scope } };

  const [chapters, activeMembers, applications, payments, certificates, events] = await Promise.all([
    prisma.chapters.findMany({
      where: scope === null ? undefined : { id: { in: scope } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, _count: { select: { members: true, applications: true } } },
    }),
    prisma.member.findMany({ where: { ...memberWhere, membershipStatus: "ACTIVE" }, select: { id: true, chapterId: true } }),
    prisma.membershipApplication.findMany({ where: applicationWhere, select: { id: true, chapterId: true, status: true, submittedAt: true } }),
    prisma.payment.findMany({ where: paymentWhere, select: { id: true, chapterId: true, amount: true, status: true, createdAt: true, paidAt: true } }),
    prisma.certificate.findMany({ where: scope === null ? undefined : { chapterId: { in: scope } }, select: { id: true, chapterId: true, status: true } }),
    prisma.event.findMany({ where: scope === null ? undefined : { OR: [{ chapterId: null }, { chapterId: { in: scope } }] }, select: { id: true, chapterId: true, status: true, startsAt: true } }),
  ]);

  const paidTotal = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const pendingTotal = payments.filter((payment) => payment.status === "PENDING" || payment.status === "PROCESSING").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const pendingApplications = applications.filter((item) => ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "PENDING_REQUIREMENTS"].includes(item.status)).length;
  const validCertificates = certificates.filter((item) => item.status === "VALID").length;
  const upcomingEvents = events.filter((event) => event.status === "PUBLISHED" && event.startsAt > new Date()).length;

  const chapterRows = chapters.map((chapter) => {
    const members = activeMembers.filter((member) => member.chapterId === chapter.id).length;
    const apps = applications.filter((item) => item.chapterId === chapter.id).length;
    const paid = payments.filter((payment) => payment.chapterId === chapter.id && payment.status === "PAID").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    const pending = payments.filter((payment) => payment.chapterId === chapter.id && (payment.status === "PENDING" || payment.status === "PROCESSING")).reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    return { chapter, members, apps, paid, pending };
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Analytics</p><h1>Operational Reports</h1></div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <Metric label="Active Members" value={activeMembers.length.toLocaleString()} />
          <Metric label="Pending Applications" value={pendingApplications.toLocaleString()} />
          <Metric label="Confirmed Collections" value={php(paidTotal)} />
          <Metric label="Pending Payments" value={php(pendingTotal)} />
          <Metric label="Valid Certificates" value={validCertificates.toLocaleString()} />
          <Metric label="Upcoming Events" value={upcomingEvents.toLocaleString()} />
        </section>

        <section className="app-panel" style={{ marginTop: 18, overflowX: "auto" }}>
          <h2>Chapter Summary</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr><th align="left">Chapter</th><th align="left">Status</th><th align="right">Active Members</th><th align="right">Applications</th><th align="right">Collected</th><th align="right">Pending Payments</th></tr></thead>
            <tbody>{chapterRows.map((row) => (
              <tr key={row.chapter.id} style={{ borderTop: "1px solid #eee5d4" }}>
                <td>{row.chapter.name}</td><td>{row.chapter.status}</td><td align="right">{row.members}</td><td align="right">{row.apps}</td><td align="right">{php(row.paid)}</td><td align="right">{php(row.pending)}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className="app-panel" style={{ marginTop: 18 }}>
          <h2>Report Integrity</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6 }}>All figures are derived from the authoritative membership, payment, certificate, and event records within your permitted chapter scope. Posted financial history is not silently deleted; reversals and refunds remain traceable.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="app-panel"><small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", marginTop: 8, fontSize: "1.45rem" }}>{value}</strong></div>;
}
