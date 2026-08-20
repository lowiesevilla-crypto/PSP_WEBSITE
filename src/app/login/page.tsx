import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const context = await getAuthContext();
  if (context) {
    const hasNationalAdminAccess = context.assignments.some(
      (assignment) =>
        assignment.chapterId === null &&
        assignment.permissions.some((permission) =>
          ["chapters.manage", "applications.review", "members.manage"].includes(permission),
        ),
    );
    redirect(hasNationalAdminAccess && !context.user.member ? "/admin" : "/member");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background:
          "radial-gradient(circle at 15% 10%, rgba(254,192,9,.18), transparent 30%), #0d0d0d",
      }}
    >
      <section
        style={{
          width: "min(460px, 100%)",
          background: "#fff",
          color: "#151515",
          borderRadius: 24,
          padding: "clamp(24px, 6vw, 38px)",
          boxShadow: "0 24px 70px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "grid", justifyItems: "center", gap: 12, marginBottom: 28 }}>
          <Image
            src="/brand/psp-logo.jpg"
            alt="Psi Sigma Phi Philippines Inc."
            width={88}
            height={88}
            style={{ borderRadius: "50%", objectFit: "cover", background: "#fff" }}
            priority
          />
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, color: "#8a6a00", fontWeight: 900, letterSpacing: ".06em" }}>
              Ψ Σ Φ
            </p>
            <h1 style={{ margin: "5px 0 4px", fontSize: "1.8rem", color: "#151515" }}>
              PSP Account Sign In
            </h1>
            <p style={{ margin: 0, color: "#746b5b" }}>
              Members and authorized administrators use this secure sign-in.
            </p>
          </div>
        </div>

        <LoginForm />

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #ece5d7",
            textAlign: "center",
            color: "#746b5b",
          }}
        >
          Not yet registered?{" "}
          <a href="/register" style={{ fontWeight: 800, color: "#7a5c00" }}>
            Apply online
          </a>
        </div>
      </section>
    </main>
  );
}
