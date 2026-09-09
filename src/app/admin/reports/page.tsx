import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { php } from "@/lib/finance/ledger";
import { Prisma } from "@prisma/client";
import { SPLIT_PAYMENT_AUDIT_ACTION, splitAmountsFromMetadata } from "@/lib/paymongo/split-metadata";

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
    prisma.payment.findMany({ where: { ...paymentWhere, status: "PAID" }, select: { id: true, chapterId: true, amount: true, status: true, createdAt: true, paidAt: true } }),
    prisma.certificate.findMany({ where: scope === null ? undefined : { chapterId: { in: scope } }, select: { id: true, chapterId: true, status: true } }),
    prisma.event.findMany({ where: scope === null ? undefined : { OR: [{ chapterId: null }, { chapterId: { in: scope } }] }, select: { id: true, chapterId: true, status: true, startsAt: true } }),
  ]);
  const paymentSplitAudits = payments.length ? await prisma.auditLog.findMany({
    where: {
      action: SPLIT_PAYMENT_AUDIT_ACTION,
      entityType: "Payment",
      entityId: { in: payments.map((payment) => payment.id) },
    },
    select: { entityId: true, metadataJson: true },
    orderBy: { createdAt: "desc" },
  }) : [];

  const splitByPaymentId = new Map<string, unknown>();
  for (const audit of paymentSplitAudits) {
    if (audit.entityId && !splitByPaymentId.has(audit.entityId)) splitByPaymentId.set(audit.entityId, audit.metadataJson);
  }
  let paidTotal = new Prisma.Decimal(0);
  let convenienceFeeTotal = new Prisma.Decimal(0);
  for (const payment of payments) {
    const split = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount);
    paidTotal = paidTotal.plus(split.chapterAmount);
    convenienceFeeTotal = convenienceFeeTotal.plus(split.platformFee);
  }
  const pendingApplications = applications.filter((item) => ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "PENDING_REQUIREMENTS"].includes(item.status)).length;
  const validCertificates = certificates.filter((item) => item.status === "VALID").length;
  const upcomingEvents = events.filter((event) => event.status === "PUBLISHED" && event.startsAt > new Date()).length;

  const chapterRows = chapters.map((chapter) => {
    const members = activeMembers.filter((member) => member.chapterId === chapter.id).length;
    const apps = applications.filter((item) => item.chapterId === chapter.id).length;
    let paid = new Prisma.Decimal(0);
    let fees = new Prisma.Decimal(0);
    let successfulPayments = 0;
    for (const payment of payments.filter((item) => item.chapterId === chapter.id)) {
      const split = splitAmountsFromMetadata(splitByPaymentId.get(payment.id), payment.amount);
      paid = paid.plus(split.chapterAmount);
      fees = fees.plus(split.platformFee);
      successfulPayments += 1;
    }
    return { chapter, members, apps, paid, fees, successfulPayments };
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting">
          <p>Analytics</p>
          <h1>Operational Reports</h1>
        </div>

        <section className="admin-stat-grid">
          <Metric label="Active Members" value={activeMembers.length.toLocaleString()} />
          <Metric label="Pending Applications" value={pendingApplications.toLocaleString()} />
          <Metric label="Successful Payments" value={payments.length.toLocaleString("en-PH")} />
          <Metric label="Total Collected" value={php(paidTotal)} />
          <Metric label="Convenience Fees Collected" value={php(convenienceFeeTotal)} />
          <Metric label="Valid Certificates" value={validCertificates.toLocaleString()} />
          <Metric label="Upcoming Events" value={upcomingEvents.toLocaleString()} />
        </section>

        <section className="app-panel" style={{ marginTop: 18, overflowX: "auto" }}>
          <h2>Chapter Summary</h2>
          <table className="admin-responsive-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th align="left">Chapter</th>
                <th align="left">Status</th>
                <th align="right">Active Members</th>
                <th align="right">Applications</th>
                <th align="right">Successful Payments</th>
                <th align="right">Total Collected</th>
                <th align="right">Convenience Fees</th>
              </tr>
            </thead>
            <tbody>
              {chapterRows.map((row) => (
                <tr key={row.chapter.id}>
                  <td data-label="Chapter"><strong>{row.chapter.name}</strong></td>
                  <td data-label="Status">{row.chapter.status}</td>
                  <td data-label="Active Members" align="right">{row.members}</td>
                  <td data-label="Applications" align="right">{row.apps}</td>
                  <td data-label="Successful Payments" align="right">{row.successfulPayments}</td>
                  <td data-label="Total Collected" align="right">{php(row.paid)}</td>
                  <td data-label="Convenience Fees" align="right">{php(row.fees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="app-panel" style={{ marginTop: 18 }}>
          <h2>Report Integrity</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
            Collection figures include successful PAID payments only. Cancelled, failed, pending, processing, refunded, and deleted bill records are excluded from collection totals so reports do not overstate PSP money collected.
          </p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-panel">
      <small style={{ color: "#746b5b", fontWeight: 800 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 8, fontSize: "1.45rem" }}>{value}</strong>
    </div>
  );
}
