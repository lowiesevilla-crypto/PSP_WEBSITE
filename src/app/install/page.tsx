import Link from "next/link";
import { PwaInstallCard } from "@/components/pwa-install-card";

// `/install` is an operational entry point linked from activation emails and
// shared directly with members. Host/CDN caches must not keep an older install
// experience after an exact PSP release has become live.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Install PSP Mobile App",
  description: "Add the official Psi Sigma Phi Philippines Inc. PWA to your phone Home Screen.",
};

export default function InstallPage() {
  return (
    <main className="app-shell" data-pwa-install-version="simple-cross-platform-pwa-v1">
      <div className="container app-main" style={{ maxWidth: 680 }}>
        <section style={{ textAlign: "center", padding: "24px 0 14px" }}>
          <img
            src="/brand/psp-logo.jpg"
            alt="Psi Sigma Phi seal"
            style={{ width: 88, height: 88, objectFit: "contain", borderRadius: "50%" }}
          />
          <p style={{ color: "#8a6800", fontWeight: 900, letterSpacing: ".14em", margin: "10px 0 6px" }}>Ψ Σ Φ</p>
          <h1 style={{ margin: 0 }}>Install PSP on Your Phone</h1>
          <p style={{ color: "#6b665c", lineHeight: 1.6, maxWidth: 560, margin: "12px auto 0" }}>
            Add PSP to your Home Screen so you can open it like a normal mobile app without searching for the website every time.
          </p>
        </section>

        <section className="app-panel" style={{ marginTop: 16 }} aria-label="Install PSP mobile app">
          <PwaInstallCard />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          {[
            ["Digital ID", "Open your PSP Digital ID directly from your phone."],
            ["Payments", "Check balances, payments and receipts."],
            ["Certificates", "Access and verify your membership certificate."],
            ["Updates", "See chapter announcements, events and notifications."],
          ].map(([title, text]) => (
            <article className="app-panel" key={title} style={{ padding: 16 }}>
              <strong>{title}</strong>
              <p style={{ color: "#6b665c", lineHeight: 1.5, marginBottom: 0 }}>{text}</p>
            </article>
          ))}
        </section>

        <p style={{ color: "#746d61", textAlign: "center", lineHeight: 1.55, margin: "18px auto 0", fontSize: ".9rem" }}>
          PSP is one secure Progressive Web App for Android, iPhone and iPad. It uses the same PSP account and updates automatically from the official website.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          <Link className="btn btn-primary" href="/login">Member Sign In</Link>
          <Link className="btn" href="/" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>PSP Website</Link>
        </div>
      </div>
    </main>
  );
}
