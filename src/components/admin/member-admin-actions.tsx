"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function MemberAdminActions({
  memberId,
  memberName,
  canResendInvitation,
  canOverrideActivation,
  temporaryPasswordPending,
  accountStatus,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  canResendInvitation: boolean;
  canOverrideActivation: boolean;
  temporaryPasswordPending: boolean;
  accountStatus: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resend" | "temporary" | "reset" | "delete" | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState("");
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

  async function setAdminTemporaryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (temporaryPassword !== confirmTemporaryPassword) {
      setError("Temporary passwords do not match.");
      return;
    }

    setBusy("temporary");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/members/${memberId}/activation-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "SET_TEMPORARY_PASSWORD", temporaryPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to set the temporary password.");
      setTemporaryPassword("");
      setConfirmTemporaryPassword("");
      setMessage(payload.message ?? "Temporary password set.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to set the temporary password.");
    } finally {
      setBusy(null);
    }
  }

  async function resetActivation() {
    const confirmed = window.confirm(
      `Reset account activation for ${memberName}?\n\nThis invalidates the current password and returns the user to the activation process. Membership, finance, certificates, roles, and history are not deleted.`,
    );
    if (!confirmed) return;

    setBusy("reset");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/members/${memberId}/activation-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "RESET_ACTIVATION" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to reset account activation.");
      setMessage(payload.message ?? "Account activation reset.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset account activation.");
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
      <small style={{ color: temporaryPasswordPending ? "#806000" : "#746b5b", fontWeight: temporaryPasswordPending ? 800 : 600 }}>
        Account: {accountStatus}{temporaryPasswordPending ? " · TEMPORARY PASSWORD — PERMANENT PASSWORD REQUIRED" : ""}
      </small>

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
        {canOverrideActivation ? (
          <button
            type="button"
            className="btn"
            disabled={busy !== null || isSelf}
            onClick={() => void resetActivation()}
            title={isSelf ? "Use normal password recovery for your own account." : undefined}
            style={{ minHeight: 44, border: "1px solid #d8c472", background: "#fff" }}
          >
            {busy === "reset" ? "Resetting…" : "Reset Activation"}
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

      {canOverrideActivation ? (
        <details style={{ border: "1px solid #e5dcc6", borderRadius: 12, padding: 10, background: "#fffdf7" }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Admin Activate / Set Temporary Password</summary>
          <form onSubmit={setAdminTemporaryPassword} style={{ display: "grid", gap: 9, marginTop: 12 }}>
            <small style={{ color: "#746b5b", lineHeight: 1.5 }}>
              Use only when the approved member cannot complete email activation. Type a temporary password and give it to the member manually. PSP never emails or stores the plaintext password. First sign-in forces the member to create a different permanent password.
            </small>
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              disabled={busy !== null || isSelf}
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              placeholder="Temporary password (10+ characters)"
              style={{ minHeight: 44, border: "1px solid #d8d1c4", borderRadius: 10, padding: "9px 10px" }}
            />
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              disabled={busy !== null || isSelf}
              value={confirmTemporaryPassword}
              onChange={(event) => setConfirmTemporaryPassword(event.target.value)}
              placeholder="Confirm temporary password"
              style={{ minHeight: 44, border: "1px solid #d8d1c4", borderRadius: 10, padding: "9px 10px" }}
            />
            <button type="submit" className="btn btn-primary" disabled={busy !== null || isSelf}>
              {busy === "temporary" ? "Activating…" : "Activate with Temporary Password"}
            </button>
          </form>
        </details>
      ) : null}

      {isSelf ? (
        <small style={{ color: "#746b5b" }}>Self credential override and self-deletion are blocked to prevent administrator lockout. Use normal password recovery for your own account.</small>
      ) : null}
      <small style={{ color: "#746b5b", lineHeight: 1.5 }}>
        Activation override changes account credentials only. Membership, Chapter assignment, roles, finance, certificates, Digital ID, and audit history are retained.
      </small>
      {message ? <div role="status" style={{ padding: 10, borderRadius: 10, background: "#eff9ea", color: "#355625" }}>{message}</div> : null}
      {error ? <div role="alert" style={{ padding: 10, borderRadius: 10, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
    </div>
  );
}
