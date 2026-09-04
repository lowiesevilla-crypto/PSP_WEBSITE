import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthContext } from "@/lib/auth/context";
import styles from "./login.module.css";

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
    redirect(hasNationalAdminAccess ? "/admin" : "/member");
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.card} aria-labelledby="psp-login-heading">
        <header className={styles.brand}>
          <Image
            src="/brand/psp-logo.jpg"
            alt="Psi Sigma Phi Philippines Inc."
            width={88}
            height={88}
            className={styles.logo}
            priority
          />
          <p className={styles.eyebrow}>Ψ Σ Φ</p>
          <h1 id="psp-login-heading" className={styles.title}>
            Welcome to PSP
          </h1>
          <div className={styles.ornament} aria-hidden="true">
            <span>★</span>
          </div>
          <p className={styles.subtitle}>
            Members and authorized administrators can sign in securely to access PSP.
          </p>
        </header>

        <LoginForm />

        <footer className={styles.footer}>
          <p className={styles.applyRow}>
            New to PSP?{" "}
            <a href="/register" className={styles.applyLink}>
              Apply online
            </a>
          </p>
          <p className={styles.support}>
            <SupportIcon />
            <span>
              Need access? Contact your <strong>chapter administrator.</strong>
            </span>
          </p>
        </footer>
      </section>
    </main>
  );
}

function SupportIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "#b88400", flex: "0 0 auto" }}
    >
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v5a2 2 0 0 0 2 2h1v-8H6a2 2 0 0 0-2 2Z" />
      <path d="M20 13v5a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z" />
      <path d="M16 20c0 1.1-.9 2-2 2h-2" />
    </svg>
  );
}
