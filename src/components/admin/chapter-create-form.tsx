"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChapterCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      foundingDate: String(form.get("foundingDate") ?? "") || undefined,
      email: String(form.get("email") ?? "") || undefined,
      phone: String(form.get("phone") ?? "") || undefined,
      address: String(form.get("address") ?? "") || undefined,
    };

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; chapter?: { name?: string } };
      if (!response.ok) throw new Error(result.message ?? "Unable to create chapter.");
      setMessage(`${result.chapter?.name ?? "Chapter"} created successfully.`);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create chapter.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="app-panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Create Chapter</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Field name="code" label="Chapter Code" required />
        <Field name="name" label="Chapter Name" required />
        <Field name="foundingDate" label="Founding Date" type="date" />
        <Field name="email" label="Chapter Email" type="email" />
        <Field name="phone" label="Chapter Contact No." />
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 800 }}>Address</span>
        <textarea name="address" rows={3} maxLength={1000} style={{ border: "1px solid #ded7c7", borderRadius: 10, padding: 10, resize: "vertical" }} />
      </label>
      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.65 : 1 }}>
        {submitting ? "Creating…" : "Create Chapter"}
      </button>
      {message ? <div role="status" style={{ color: "#665b47" }}>{message}</div> : null}
    </form>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 800 }}>{label}{required ? " *" : ""}</span>
      <input name={name} type={type} required={required} style={{ minHeight: 44, border: "1px solid #ded7c7", borderRadius: 10, padding: "8px 10px" }} />
    </label>
  );
}
