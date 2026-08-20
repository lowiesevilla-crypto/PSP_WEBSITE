import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { MemberTransferForm } from "@/components/admin/member-transfer-form";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const viewScope = authorizedChapterIds(context, "members.view");
  if (viewScope !== null && viewScope.length === 0) redirect("/admin");

  const manageScope = authorizedChapterIds(context, "members.manage");
  const [members, manageableChapters] = await Promise.all([
    prisma.member.findMany({
      where: viewScope === null ? undefined : { chapterId: { in: viewScope } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        chapter: { select: { id: true, code: true, name: true } },
        user: { select: { email: true, status: true } },
      },
      take: 100,
    }),
    prisma.chapters.findMany({
      where: {
        status: "ACTIVE",
        ...(manageScope === null ? {} : { id: { in: manageScope } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="app-greeting">
            <p>Membership</p>
            <h1>Member Directory</h1>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        {members.length === 0 ? (
          <div className="app-panel"><p style={{ margin: 0 }}>No members are available in your authorized scope.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
            {members.map((member) => (
              <article className="app-panel" key={member.id}>
                <small style={{ color: "#746b5b", fontWeight: 800 }}>{member.chapter.name} · {member.chapter.code}</small>
                <h2 style={{ margin: "5px 0 2px" }}>{[member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ")}</h2>
                <div style={{ color: "#665b47", fontWeight: 700 }}>{member.membershipNo}</div>

                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  <Info label="Status" value={member.membershipStatus} />
                  <Info label="Email" value={member.user.email} />
                  <Info label="Mobile No." value={member.mobile || "—"} />
                  <Info label="PSP Birthday Code" value={member.pspBirthdayCode || "—"} />
                  <Info label="Date Survive" value={member.dateSurvive?.toLocaleDateString("en-PH") || "—"} />
                  <Info label="Location" value={member.surviveLocation || "—"} />
                </div>

                {hasPermission(context, "members.manage", member.chapterId) ? (
                  <MemberTransferForm
                    memberId={member.id}
                    currentChapterId={member.chapterId}
                    chapters={manageableChapters}
                  />
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
    <div>
      <small style={{ display: "block", color: "#746b5b" }}>{label}</small>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
