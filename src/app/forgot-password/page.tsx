import Image from "next/image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#0d0d0d" }}>
      <section style={{ width: "min(470px, 100%)", background: "#fff", borderRadius: 24, padding: "clamp(24px, 6vw, 38px)" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <Image src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc." width={78} height={78} style={{ borderRadius: "50%" }} />
          <h1 style={{ margin: 0 }}>Forgot Password</h1>
          <p style={{ margin: 0, color: "#746b5b" }}>Request a secure password reset link.</p>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
