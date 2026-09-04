import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { UserStatusControl } from "@/components/admin/user-status-control";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!hasPermission(context, "roles.manage", null)) redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
    take: 300,
    include: {
      member: {
        select: {
          membershipNo: true,
          membershipStatus: true,
          chapter: { select: { name: true, code: true } },
        },
      },
      roleAssignments: {
        where: { endsAt: null },
        select: {
          role: { select: { code: true, name: true } },
          chapter: { select: { name: true, code: true } },
        },
      },
    },
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div className="app-greeting">
            <p>Access Governance</p>
            <h1>User Management</h1>
          </div>
          <Link href="/admin" className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff" }}>Back to Admin</Link>
        </div>

        <div className="app-panel" style={{ marginBottom: 16 }}>
          <strong>National Administration Control</strong>
          <p style={{ margin: "6px 0 0", color: "#665b47", lineHeight: 1.55 }}>
            Disable or suspend an account to block login immediately. This does not delete membership, chapter, finance, audit, or historical records.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          {users.map((user) => (
            <article key={user.id} className="app-panel" style={{ display: "grid", gap: 12 }}>
              <div>
                <small style={{ color: "#746b5b", fontWeight: 800 }}>ACCOUNT · {user.status}</small>
                <h2 style={{ margin: "4px 0" }}>{user.displayName}</h2>
                <div style={{ color: "#665b47", overflowWrap: "anywhere" }}>{user.email}</div>
              </div>

              {user.member ? (
                <div style={{ padding: 12, borderRadius: 12, background: "#f7f4ec" }}>
                  <strong>{user.member.membershipNo}</strong>
                  <div style={{ marginTop: 4, color: "#665b47" }}>{user.member.chapter.name} · {user.member.chapter.code}</div>
                  <small>{user.member.membershipStatus}</small>
                </div>
              ) : null}

              <div>
                <strong>Active Roles</strong>
                {user.roleAssignments.length === 0 ? (
                  <p style={{ color: "#746b5b", marginBottom: 0 }}>No active role assignment.</p>
                ) : (
                  <ul style={{ paddingLeft: 20, marginBottom: 0, color: "#665b47" }}>
                    {user.roleAssignments.map((assignment, index) => (
                      <li key={`${assignment.role.code}-${assignment.chapter?.code ?? "NATIONAL"}-${index}`}>
                        {assignment.role.name}{assignment.chapter ? ` · ${assignment.chapter.name}` : " · National"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <UserStatusControl userId={user.id} displayName={user.displayName} status={user.status} isSelf={user.id === context.user.id} />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
