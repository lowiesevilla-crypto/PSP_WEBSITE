"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";

export function UserStatusControl({ userId, displayName, status, isSelf = false }: { userId: string; displayName: string; status: UserStatus; isSelf?: boolean }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<UserStatus>(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (busy || nextStatus === status) return;
    if ((nextStatus === "SUSPENDED" || nextStatus === "DISABLED") && !window.confirm(`${nextStatus === "DISABLED" ? "Deactivate" : "Suspend"} ${displayName}? Access will be blocked immediately.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as { message?: string; user?: { status?: UserStatus } };
      if (!response.ok) throw new Error(result.message ?? "Unable to update user status.");
      setMessage(`User status changed to ${result.user?.status ?? nextStatus}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update user status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
        <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as UserStatus)} disabled={busy || isSelf} style={{ minHeight: 44 }}>
          <option value="ACTIVE">Active</option>
          <option value="INVITED">Invited</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DISABLED">Disabled / Deactivated</option>
        </select>
        <button type="button" className="btn" disabled={busy || isSelf || nextStatus === status} onClick={() => void save()} style={{ border: "1px solid #ddd5c1", background: "#fff" }}>
          {busy ? "Saving…" : "Update"}
        </button>
      </div>
      {isSelf ? <small style={{ color: "#746b5b" }}>Your current National Admin session cannot deactivate itself.</small> : null}
      {message ? <small role="status" style={{ color: "#665b47" }}>{message}</small> : null}
    </div>
  );
}
