import Link from "next/link";

const features = [
  {
    icon: "ID",
    title: "Digital Membership",
    description:
      "Secure member records, chapter affiliation, membership status, and a premium digital member experience.",
  },
  {
    icon: "Ψ",
    title: "Multi-Chapter Management",
    description:
      "National administration with strict chapter-scoped membership, officers, content, events, and reporting.",
  },
  {
    icon: "₱",
    title: "Dues & PayMongo",
    description:
      "Configurable chapter dues, member ledgers, secure online payment, digital receipts, and reconciliation.",
  },
  {
    icon: "QR",
    title: "Verified Certificates",
    description:
      "Downloadable Certificates of Membership with unique certificate numbers and live QR verification.",
  },
  {
    icon: "◎",
    title: "Community",
    description:
      "Chapter and national posts, images, comments, official announcements, and moderated engagement.",
  },
  {
    icon: "EV",
    title: "Events & Organization",
    description:
      "National and chapter events plus configurable officer positions, committees, and historical terms.",
  },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" href="/" aria-label="Psi Sigma Phi Philippines Inc. home">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi Philippines Inc. seal" />
            <span className="brand-copy">
              <small>Ψ Σ Φ</small>
              <span>Psi Sigma Phi Philippines Inc.</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#platform">Platform</a>
            <a href="#chapters">Chapters</a>
            <a href="#membership">Membership</a>
            <a href="#events">Events</a>
          </nav>

          <div className="nav-actions">
            <Link className="btn btn-secondary" href="/member">
              Member Login
            </Link>
            <Link className="btn btn-primary" href="/register">
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Official Digital Membership Platform</div>
            <h1>
              One brotherhood. <span>Every chapter connected.</span>
            </h1>
            <p>
              A premium, mobile-first Psi Sigma Phi ecosystem for membership, chapter
              organization, community updates, events, online dues, digital receipts,
              and QR-verifiable Certificates of Membership.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/register">
                Start Membership Registration
              </Link>
              <Link className="btn btn-secondary" href="/member">
                Preview Member PWA
              </Link>
            </div>
            <div className="trust-row" aria-label="Platform highlights">
              <span>Installable PWA</span>
              <span>Chapter Scoped</span>
              <span>PayMongo Ready</span>
              <span>QR Verified</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Psi Sigma Phi official seal">
            <div className="hero-orbit" aria-hidden="true" />
            <div className="seal-card">
              <img src="/brand/psp-logo.jpg" alt="Official Psi Sigma Phi Philippines Inc. seal" />
            </div>
            <div className="platform-chip">
              <strong>National → Chapter → Member</strong>
              <span>One secure platform with chapter-specific organization and finance.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <div className="section-header">
            <h2>Built for the full Ψ Σ Φ ecosystem.</h2>
            <p>
              The first release combines the official website, installable Member PWA,
              Chapter Admin Portal, and National/System Admin Portal in one architecture.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="membership">
        <div className="container">
          <div className="section-header">
            <h2>Designed mobile-first for every member.</h2>
            <p>
              Core membership workflows are designed to work completely from a phone,
              while chapter and national administration adapt cleanly to tablet and desktop.
            </p>
          </div>

          <div className="member-preview">
            <div className="member-card">
              <div className="member-card-top">
                <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
                <span className="member-card-status">ACTIVE MEMBER</span>
              </div>
              <div className="member-card-name">Juan Dela Cruz</div>
              <div className="member-card-meta">
                <div>
                  <small>Member No.</small>
                  <strong>PSP-2026-000001</strong>
                </div>
                <div>
                  <small>Chapter</small>
                  <strong>Sample Chapter</strong>
                </div>
              </div>
            </div>

            <div className="member-dashboard">
              <div className="metric-card gold">
                <small>Outstanding Dues</small>
                <strong>₱500.00</strong>
              </div>
              <div className="metric-card">
                <small>Next Event</small>
                <strong>Chapter Assembly</strong>
              </div>
              <div className="metric-card">
                <small>Certificate</small>
                <strong>Available</strong>
              </div>
              <div className="metric-card">
                <small>Community</small>
                <strong>12 New Updates</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="chapters">
        <div className="container section-header">
          <h2>Independent chapters. One national platform.</h2>
          <p>
            Each chapter can maintain its own officers, organization structure, member list,
            monthly contribution rate, events, announcements, and financial reporting without
            exposing restricted chapter information to other chapters.
          </p>
        </div>
      </section>

      <section className="section" id="events">
        <div className="container section-header">
          <h2>Registration is only the beginning.</h2>
          <p>
            The roadmap continues through community engagement, PayMongo payments,
            verifiable certificates, reporting, auditability, and future digital member ID.
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-row">
          <div>© 2026 Psi Sigma Phi Philippines Inc.</div>
          <div>Ψ Σ Φ Digital Membership Platform · Foundation Build</div>
        </div>
      </footer>
    </main>
  );
}
