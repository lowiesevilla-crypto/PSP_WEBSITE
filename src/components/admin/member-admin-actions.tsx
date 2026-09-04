"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MemberAdminActions({
  memberId,
  memberName,
  canResendInvitation,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  canResendInvitation: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resend" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resendInvitation() {
    setBusy("resend");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/members/${memberId}/resend-invitation`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to resend the invitation.");
      setMessage(payload.message ?? "Invitation sent.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resend the invitation.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteMember() {
    const confirmed = window.confirm(
      `Delete ${memberName} from active membership?\n\nThis removes chapter access, revokes the Digital Member ID and valid certificates, and archives the membership. Financial, certificate, membership, and audit history will be preserved.`,
    );
    if (!confirmed) return;

    setBusy("delete");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to delete the member.");
      setMessage(payload.message ?? "Member deleted from active membership.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the member.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 16, paddingTop: 15, borderTop: "1px solid #ece5d7" }}>
      <strong style={{ fontSize: ".86rem" }}>Member Administration</strong>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {canResendInvitation ? (
          <button
            type="button"
            className="btn"
            disabled={busy !== null}
            onClick={() => void resendInvitation()}
            style={{ minHeight: 44, border: "1px solid #d8c472", background: "#fff9df" }}
          >
            {busy === "resend" ? "Sending…" : "Resend Invitation"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn"
          disabled={busy !== null || isSelf}
          onClick={() => void deleteMember()}
          title={isSelf ? "You cannot delete your own membership while signed in." : undefined}
          style={{ minHeight: 44, border: "1px solid #e2b0b0", background: "#fff5f5", color: "#7b2424" }}
        >
          {busy === "delete" ? "Deleting…" : "Delete Member"}
        </button>
      </div>
      {isSelf ? (
        <small style={{ color: "#746b5b" }}>Self-deletion is blocked to prevent administrator lockout.</small>
      ) : null}
      <small style={{ color: "#746b5b", lineHeight: 1.5 }}>
        Delete uses a non-destructive archive so required PSP membership, finance, certificate, and audit history is retained.
      </small>
      {message ? <div role="status" style={{ padding: 10, borderRadius: 10, background: "#eff9ea", color: "#355625" }}>{message}</div> : null}
      {error ? <div role="alert" style={{ padding: 10, borderRadius: 10, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
    </div>
  );
}
