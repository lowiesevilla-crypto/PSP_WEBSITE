import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChapterPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const now = new Date();
  const [positions, committees] = await Promise.all([
    prisma.chapterPosition.findMany({
      where: { chapterId: member.chapterId, isActive: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        assignments: {
          where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          include: { member: { select: { firstName: true, lastName: true, membershipNo: true } } },
        },
      },
    }),
    prisma.committee.findMany({
      where: { chapterId: member.chapterId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        memberships: {
          where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          include: { member: { select: { firstName: true, lastName: true, membershipNo: true } } },
        },
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Dashboard</Link>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>My Chapter</p>
          <h1>{member.chapter.name}</h1>
        </div>

        <section className="app-panel" style={{ marginBottom: 18 }}>
          <h2>Chapter Information</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.65 }}>{member.chapter.description ?? "Official chapter information will appear here."}</p>
          {member.chapter.address ? <p><strong>Address:</strong> {member.chapter.address}</p> : null}
        </section>

        <section className="app-panel" style={{ marginBottom: 18 }}>
          <h2>Current Officers</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {positions.map((position) => (
              <div key={position.id} style={cardStyle}>
                <small style={{ color: "#806500", fontWeight: 900 }}>{position.name}</small>
                {position.assignments.length > 0 ? position.assignments.map((assignment) => (
                  <div key={assignment.id} style={{ marginTop: 8 }}>
                    <strong>{assignment.member.firstName} {assignment.member.lastName}</strong>
                    <div style={{ color: "#766f62", fontSize: ".82rem" }}>{assignment.member.membershipNo}</div>
                  </div>
                )) : <p style={{ color: "#777", marginBottom: 0 }}>No current assignment</p>}
              </div>
            ))}
            {positions.length === 0 ? <p style={{ color: "#777" }}>No officer positions have been configured yet.</p> : null}
          </div>
        </section>

        <section className="app-panel">
          <h2>Committees</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {committees.map((committee) => (
              <div key={committee.id} style={cardStyle}>
                <strong>{committee.name}</strong>
                {committee.description ? <p style={{ color: "#6b665c" }}>{committee.description}</p> : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {committee.memberships.map((membership) => (
                    <span key={membership.id} style={{ padding: "6px 9px", borderRadius: 999, background: "#f6f0df", fontSize: ".82rem" }}>
                      {membership.member.firstName} {membership.member.lastName}{membership.roleLabel ? ` · ${membership.roleLabel}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {committees.length === 0 ? <p style={{ color: "#777" }}>No active committees have been published yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e6e0d2",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};
