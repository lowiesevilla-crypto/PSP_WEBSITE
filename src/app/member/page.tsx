import Link from "next/link";

export const metadata = {
  title: "Member Dashboard",
};

const actions = [
  ["₱", "Pay Dues"],
  ["QR", "My Certificate"],
  ["EV", "Events"],
  ["◎", "Community"],
];

export default function MemberDashboardPage() {
  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/">
            <img src="/brand/psp-logo.png" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: ".82rem", color: "#6b665c" }}>Sample Member</span>
            <div
              aria-label="Member avatar"
              style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: "50%", background: "#fec009", fontWeight: 900 }}
            >
              JD
            </div>
          </div>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>Thursday · Member Portal</p>
          <h1>Welcome back, Brod Juan.</h1>
        </div>

        <div className="app-grid">
          <section>
            <div className="member-card">
              <div className="member-card-top">
                <img src="/brand/psp-logo.png" alt="Psi Sigma Phi seal" />
                <span className="member-card-status">ACTIVE MEMBER</span>
              </div>
              <div className="member-card-name">Juan Dela Cruz</div>
              <div className="member-card-meta">
                <div>
                  <small>Membership No.</small>
                  <strong>PSP-2026-000001</strong>
                </div>
                <div>
                  <small>Primary Chapter</small>
                  <strong>Sample Chapter</strong>
                </div>
              </div>
            </div>

            <div className="quick-actions" aria-label="Quick actions">
              {actions.map(([icon, label]) => (
                <Link className="quick-action" href="#" key={label}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            <div className="app-panel" style={{ marginTop: 18 }}>
              <h2>Latest Chapter Update</h2>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 14, background: "#151515", color: "#fec009", fontWeight: 900 }}>
                  Ψ
                </div>
                <div>
                  <strong>Monthly Chapter Assembly</strong>
                  <p style={{ margin: "6px 0 0", color: "#6b665c", lineHeight: 1.55 }}>
                    Official announcements and community posts will appear here based on the member&apos;s chapter and authorized national audience.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <div className="app-panel">
              <h2>Financial Summary</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: 16, borderRadius: 16, background: "#151515", color: "white" }}>
                  <small style={{ color: "#aaa" }}>Outstanding Balance</small>
                  <strong style={{ display: "block", marginTop: 6, fontSize: "1.75rem", color: "#fec009" }}>₱500.00</strong>
                </div>
                <button type="button" className="btn btn-primary" style={{ width: "100%" }}>Pay with PayMongo</button>
              </div>
            </div>

            <div className="app-panel">
              <h2>Upcoming Event</h2>
              <strong>Chapter Assembly</strong>
              <p style={{ color: "#6b665c", lineHeight: 1.55 }}>August 30, 2026 · 6:00 PM</p>
              <button type="button" className="btn" style={{ width: "100%", border: "1px solid #ddd5c1", background: "#fff" }}>View Event</button>
            </div>

            <div className="app-panel">
              <h2>Membership Certificate</h2>
              <p style={{ color: "#6b665c", lineHeight: 1.55 }}>Your QR-verifiable certificate is available for download.</p>
              <button type="button" className="btn" style={{ width: "100%", color: "white", background: "#151515" }}>Open Certificate</button>
            </div>
          </aside>
        </div>
      </div>

      <nav className="app-bottom-nav" aria-label="Member mobile navigation">
        <Link className="active" href="/member">Home</Link>
        <Link href="#">Community</Link>
        <Link href="#">Events</Link>
        <Link href="#">Payments</Link>
        <Link href="#">More</Link>
      </nav>
    </main>
  );
}
