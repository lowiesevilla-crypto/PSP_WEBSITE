import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#0d0d0d" }}>
      <section style={{ width: "min(470px, 100%)", background: "#fff", borderRadius: 24, padding: "clamp(24px, 6vw, 38px)" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <Image src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc." width={78} height={78} style={{ borderRadius: "50%" }} />
          <h1 style={{ margin: 0 }}>Reset Password</h1>
        </div>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div role="alert" style={{ padding: 16, borderRadius: 14, background: "#fff1f1", color: "#7b2424" }}>
            This password reset link is incomplete or invalid.
          </div>
        )}
      </section>
    </main>
  );
}
