import Link from "next/link";
import { redirect } from "next/navigation";
import {
  authorizedChapterIds,
  getAuthContext,
  hasPermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { ApplicationReviewControls } from "@/components/admin/application-review-controls";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const scope = authorizedChapterIds(context, "applications.view");
  if (scope !== null && scope.length === 0) redirect("/admin");

  const applications = await prisma.membershipApplication.findMany({
    where: {
      status: {
        in: ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "PENDING_REQUIREMENTS"],
      },
      ...(scope === null ? {} : { chapterId: { in: scope } }),
    },
    orderBy: { submittedAt: "asc" },
    include: { chapter: { select: { id: true, code: true, name: true } } },
    take: 100,
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Membership</p>
            <h1>Application Review Queue</h1>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        {applications.length === 0 ? (
          <div className="app-panel"><p style={{ margin: 0 }}>No pending applications in your authorized chapter scope.</p></div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {applications.map((application) => (
              <article className="app-panel" key={application.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <small style={{ color: "#746b5b", fontWeight: 800 }}>{application.chapter.name} · {application.chapter.code}</small>
                    <h2 style={{ margin: "5px 0 0" }}>
                      {[application.firstName, application.middleInitial, application.lastName].filter(Boolean).join(" ")}
                    </h2>
                  </div>
                  <span style={{ alignSelf: "start", padding: "7px 10px", borderRadius: 999, background: "#fff4c8", fontWeight: 800, fontSize: ".78rem" }}>
                    {application.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 16 }}>
                  <Info label="Address" value={application.address || "—"} />
                  <Info label="Email" value={application.email} />
                  <Info label="Mobile No." value={application.mobile || "—"} />
                  <Info label="Date Survive" value={application.dateSurvive?.toLocaleDateString("en-PH") || "—"} />
                  <Info label="Location" value={application.surviveLocation || "—"} />
                  <Info label="PSP Birthday Code" value={application.pspBirthdayCode || "—"} />
                  <Info label="Date of Birth" value={application.birthDate?.toLocaleDateString("en-PH") || "—"} />
                  <Info label="Submitted" value={application.submittedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })} />
                </div>

                {application.reviewNotes ? (
                  <div style={{ marginTop: 14, padding: 13, borderRadius: 12, background: "#f7f4ec" }}>
                    <strong>Current Review Notes</strong>
                    <p style={{ marginBottom: 0 }}>{application.reviewNotes}</p>
                  </div>
                ) : null}

                {hasPermission(context, "applications.review", application.chapterId) ? (
                  <ApplicationReviewControls applicationId={application.id} />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <small style={{ display: "block", color: "#746b5b" }}>{label}</small>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
