import Image from "next/image";
import { redirect } from "next/navigation";
import { ChangeTemporaryPasswordForm } from "@/components/auth/change-temporary-password-form";
import { getTemporaryPasswordUser } from "@/lib/auth/temporary-password";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getTemporaryPasswordUser();
  if (!user) redirect("/login");

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#0d0d0d" }}>
      <section style={{ width: "min(500px, 100%)", background: "#fff", borderRadius: 24, padding: "clamp(24px, 6vw, 38px)", color: "#151515" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <Image src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc." width={78} height={78} style={{ borderRadius: "50%" }} />
          <small style={{ color: "#806000", fontWeight: 900, letterSpacing: ".08em" }}>ACCOUNT ACTIVATION</small>
          <h1 style={{ margin: 0 }}>Create Your Permanent Password</h1>
          <p style={{ margin: 0, color: "#746b5b" }}>{user.displayName}</p>
        </div>
        <ChangeTemporaryPasswordForm />
      </section>
    </main>
  );
}
