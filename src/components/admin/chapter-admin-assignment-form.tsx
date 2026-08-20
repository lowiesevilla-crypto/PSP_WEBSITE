"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChapterAdminAssignmentForm({
  chapterId,
}: {
  chapterId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign Chapter Admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 9, marginTop: 14 }}>
      <strong>Assign Chapter Admin</strong>
      <input name="displayName" placeholder="Full name" required maxLength={191} style={{ minHeight: 42, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
      <input name="email" type="email" placeholder="Email address" required maxLength={254} style={{ minHeight: 42, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Assigning…" : "Assign Administrator"}
      </button>
      {message ? <div role="status" style={{ color: "#665b47", fontSize: ".84rem" }}>{message}</div> : null}
    </form>
  );
}
