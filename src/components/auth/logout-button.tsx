"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={submitting}
      className="btn"
      style={{ border: "1px solid #ddd5c1", background: "#fff", minHeight: 40, padding: "8px 12px" }}
    >
      {submitting ? "Signing out…" : "Sign Out"}
    </button>
  );
}
