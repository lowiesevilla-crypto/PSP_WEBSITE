"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChapterLogoControl({
  chapterId,
  chapterName,
  logoUrl,
}: {
  chapterId: string;
  chapterName: string;
  logoUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Select a chapter logo first.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}/logo`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to upload chapter logo.");
      formElement.reset();
      setMessage(payload.message ?? "Chapter logo updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload chapter logo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm(`Remove the custom logo for ${chapterName}? PSP will use the official national logo instead.`)) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}/logo`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to remove chapter logo.");
      setMessage(payload.message ?? "Custom chapter logo removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove chapter logo.");
    } finally {
      setBusy(false);
    }
  }

  const hasCustomLogo = !logoUrl.endsWith("/brand/psp-logo.jpg") && logoUrl !== "/brand/psp-logo.jpg";

  return (
    <section style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee7da", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src={logoUrl}
          alt={`${chapterName} logo`}
          width={64}
          height={64}
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #FEC009", background: "#fff" }}
        />
        <div>
          <strong>Chapter Branding</strong>
          <div style={{ color: "#746b5b", fontSize: ".82rem", lineHeight: 1.45 }}>
            Used on PSP member emails. If no custom logo is uploaded, PSP uses the official national logo.
          </div>
        </div>
      </div>

      <form onSubmit={upload} style={{ display: "grid", gap: 8 }}>
        <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} required />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Upload Chapter Logo"}
          </button>
          {hasCustomLogo ? (
            <button className="btn" type="button" disabled={busy} onClick={() => void remove()} style={{ background: "#fff", border: "1px solid #ddd5c1" }}>
              Use Official PSP Logo
            </button>
          ) : null}
        </div>
      </form>
      <small style={{ color: "#746b5b" }}>JPG, PNG or WEBP · maximum 5 MB.</small>
      {message ? <div role="status" aria-live="polite" style={{ color: "#665b47" }}>{message}</div> : null}
    </section>
  );
}
