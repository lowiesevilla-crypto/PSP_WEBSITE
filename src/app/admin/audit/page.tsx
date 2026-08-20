import { redirect } from "next/navigation";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const scope = authorizedChapterIds(context, "audit.view");
  const nationalAudit = context.assignments.some((assignment) => assignment.chapterId === null && assignment.permissions.includes("audit.view"));
  if (!nationalAudit && scope !== null && scope.length === 0) redirect("/admin");

  const logs = await prisma.auditLog.findMany({
    where: nationalAudit ? undefined : { chapterId: { in: scope ?? [] } },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { actor: { select: { displayName: true, email: true } } },
  });

  return (
    <main className="app-shell">
      <div className="container app-main">
        <div className="app-greeting"><p>Security & Governance</p><h1>Audit Log</h1></div>
        <section className="app-panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead><tr><th align="left">Timestamp</th><th align="left">Action</th><th align="left">Actor</th><th align="left">Entity</th><th align="left">Chapter Scope</th><th align="left">Metadata</th></tr></thead>
            <tbody>{logs.map((log) => (
              <tr key={log.id} style={{ borderTop: "1px solid #eee5d4", verticalAlign: "top" }}>
                <td>{log.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                <td><strong>{log.action}</strong></td>
                <td>{log.actor ? <>{log.actor.displayName}<br /><small>{log.actor.email}</small></> : "System"}</td>
                <td>{log.entityType}{log.entityId ? <><br /><small>{log.entityId}</small></> : null}</td>
                <td>{log.chapterId ?? "National / System"}</td>
                <td><code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: ".75rem" }}>{log.metadataJson ? JSON.stringify(log.metadataJson) : "—"}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
        <p style={{ color: "#746b5b", fontSize: ".82rem" }}>Audit records are read-only in the application and retained for operational traceability.</p>
      </div>
    </main>
  );
}
