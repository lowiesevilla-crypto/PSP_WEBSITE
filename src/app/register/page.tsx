import Link from "next/link";

export const metadata = {
  title: "Membership Registration",
};

export default function RegistrationPage() {
  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/">
            <img src="/brand/psp-logo.png" alt="Psi Sigma Phi seal" />
            <span>Psi Sigma Phi Philippines Inc.</span>
          </Link>
          <Link className="btn btn-secondary" href="/member" style={{ color: "#151515", borderColor: "#ddd5c1" }}>
            Member Login
          </Link>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 820 }}>
        <div className="app-greeting">
          <p>Online Membership Registration</p>
          <h1>Begin your Ψ Σ Φ application.</h1>
        </div>

        <div className="app-panel">
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <strong>Step 1 of 5 · Personal Information</strong>
              <div style={{ height: 8, marginTop: 10, borderRadius: 999, background: "#eee7d5", overflow: "hidden" }}>
                <div style={{ width: "20%", height: "100%", background: "#fec009" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>First Name</span>
                <input aria-label="First Name" placeholder="Juan" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>Last Name</span>
                <input aria-label="Last Name" placeholder="Dela Cruz" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>Email Address</span>
                <input aria-label="Email Address" type="email" placeholder="member@example.com" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>Mobile Number</span>
                <input aria-label="Mobile Number" inputMode="tel" placeholder="09XX XXX XXXX" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>Birth Date</span>
                <input aria-label="Birth Date" type="date" style={fieldStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={{ fontWeight: 800, fontSize: ".86rem" }}>Requested Chapter</span>
                <select aria-label="Requested Chapter" defaultValue="" style={fieldStyle}>
                  <option value="" disabled>Select your chapter</option>
                  <option>Sample Chapter</option>
                </select>
              </label>
            </div>

            <div style={{ padding: 16, borderRadius: 16, background: "#fffae9", border: "1px solid #f0df9b", lineHeight: 1.6 }}>
              <strong>Application approval is required.</strong>
              <div style={{ marginTop: 4, color: "#6f6450", fontSize: ".9rem" }}>
                Submitting registration creates an applicant record only. Official membership is activated after the configured chapter/national review process.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Link href="/" style={{ alignSelf: "center", color: "#6b665c", fontWeight: 700 }}>Cancel</Link>
              <button type="button" className="btn btn-primary">Continue to Chapter Details</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const fieldStyle = {
  width: "100%",
  minHeight: 48,
  padding: "10px 12px",
  border: "1px solid #dcd4c0",
  borderRadius: 12,
  background: "#fff",
  color: "#151515",
  outline: "none",
};
