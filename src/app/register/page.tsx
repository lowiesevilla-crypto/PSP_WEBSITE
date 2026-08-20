import Link from "next/link";
import { RegistrationWizard } from "@/components/registration/registration-wizard";

export const metadata = {
  title: "Membership Registration",
};

export default function RegistrationPage() {
  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>Psi Sigma Phi Philippines Inc.</span>
          </Link>
          <Link
            className="btn btn-secondary"
            href="/member"
            style={{ color: "#151515", borderColor: "#ddd5c1" }}
          >
            Member Login
          </Link>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 880 }}>
        <div className="app-greeting">
          <p>Online Membership Registration</p>
          <h1>Begin your Ψ Σ Φ application.</h1>
          <p style={{ marginTop: 10, maxWidth: 720, lineHeight: 1.6 }}>
            Complete the application from your phone, tablet, or computer. Your selected
            chapter will review the submitted information before membership can be activated.
          </p>
        </div>

        <RegistrationWizard />
      </div>
    </main>
  );
}
