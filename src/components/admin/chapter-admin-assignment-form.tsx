"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChapterAdminAssignmentForm({
  chapterId,
  chapterStatus = "ACTIVE",
}: {
  chapterId: string;
  chapterStatus?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? ""),
          email: String(form.get("email") ?? ""),
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        administrator?: { displayName?: string };
        activationDelivery?: string;
      };
      if (!response.ok) throw new Error(result.message ?? "Unable to assign Chapter Admin.");

      const delivery = result.activationDelivery === "sent"
        ? " Activation email sent."
        : result.activationDelivery === "failed"
          ? " Access was assigned, but activation email delivery failed; check SMTP configuration."
          : "";
      setMessage(`${result.administrator?.displayName ?? "Administrator"} assigned.${delivery}`);
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign Chapter Admin.");
    } finally {
      setSubmitting(false);
    }
  }

  const chapterActive = chapterStatus === "ACTIVE";

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 9, marginTop: 14 }}>
      <strong>Assign Chapter Admin</strong>
      {!chapterActive ? (
        <div role="status" style={{ color: "#7b5d12", background: "#fff8df", border: "1px solid #eadb9c", borderRadius: 10, padding: 10 }}>
          Activate this chapter before assigning a new Chapter Administrator.
        </div>
      ) : null}
      <input name="displayName" placeholder="Full name" required maxLength={191} disabled={!chapterActive || submitting} style={{ minHeight: 44, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
      <input name="email" type="email" placeholder="Email address" required maxLength={254} disabled={!chapterActive || submitting} style={{ minHeight: 44, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
      <button type="submit" disabled={!chapterActive || submitting} className="btn btn-primary" style={{ opacity: !chapterActive || submitting ? 0.65 : 1 }}>
        {submitting ? "Assigning…" : "Assign Administrator"}
      </button>
      {message ? <div role="status" style={{ color: "#665b47", fontSize: ".84rem" }}>{message}</div> : null}
    </form>
  );
}
