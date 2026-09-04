import Link from "next/link";
import { PwaInstallCard } from "@/components/pwa-install-card";

export const metadata = {
  title: "Install PSP Mobile App",
  description: "Install the official Psi Sigma Phi Philippines Inc. PWA on your mobile device.",
};

export default function InstallPage() {
  return (
    <main className="app-shell" data-pwa-install-version="pwa-install-v2">
      <div className="container app-main" style={{ maxWidth: 760 }}>
        <section style={{ textAlign: "center", padding: "28px 0 18px" }}>
          <img
            src="/brand/psp-logo.jpg"
            alt="Psi Sigma Phi seal"
            style={{ width: 96, height: 96, objectFit: "contain", borderRadius: "50%" }}
          />
          <p style={{ color: "#8a6800", fontWeight: 900, letterSpacing: ".14em", marginBottom: 8 }}>Ψ Σ Φ</p>
          <h1 style={{ margin: 0 }}>Install PSP Mobile App</h1>
          <p style={{ color: "#6b665c", lineHeight: 1.65, maxWidth: 620, margin: "12px auto 0" }}>
            Add the official Psi Sigma Phi Philippines Inc. app directly from psp.hoahub.tech for your Digital ID, chapter updates, dues, online payments, receipts, certificates, and secure passkey login.
          </p>
          <p style={{ color: "#403a31", lineHeight: 1.6, maxWidth: 620, margin: "12px auto 0", fontWeight: 700 }}>
            On supported Android browsers, tap <strong>Install PSP App</strong> and confirm the phone&apos;s native installer. iPhone and iPad use Safari&apos;s Add to Home Screen flow.
          </p>
        </section>

        <section className="app-panel" style={{ marginTop: 18 }} aria-label="PSP app installer">
          <PwaInstallCard />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 18 }}>
          {[
            ["Digital ID", "Carry your QR-verifiable PSP membership identity."],
            ["Payments", "View balance, pay securely online, and receive receipts."],
            ["Certificates", "Generate and verify your official membership certificate."],
            ["Passkeys", "Use Face ID, Touch ID, Android lock, or Windows Hello."],
          ].map(([title, text]) => (
            <article className="app-panel" key={title}>
              <strong>{title}</strong>
              <p style={{ color: "#6b665c", lineHeight: 1.55, marginBottom: 0 }}>{text}</p>
            </article>
          ))}
        </section>

        <section className="app-panel" style={{ marginTop: 18, background: "#fffaf0", borderColor: "#eadcae" }}>
          <strong>Why there is no APK download</strong>
          <p style={{ color: "#625b4e", lineHeight: 1.6, marginBottom: 0 }}>
            PSP is an installable Progressive Web App (PWA), so the browser installs the official app directly from this website. A webpage cannot silently install software without your confirmation. Keeping one stable PSP web-app identity also allows supported browsers to recognize an existing installation instead of creating another copy.
          </p>
        </section>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          <Link className="btn btn-primary" href="/login">Member Sign In</Link>
          <Link className="btn" href="/" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>PSP Website</Link>
        </div>
      </div>
    </main>
  );
}
