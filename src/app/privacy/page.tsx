export default function PrivacyNoticePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f7f4ec", color: "#151515" }}>
      <div
        style={{
          width: "min(900px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "48px 0 72px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e6dfcf",
            borderRadius: 22,
            padding: "clamp(22px, 5vw, 42px)",
            boxShadow: "0 18px 48px rgba(0,0,0,.06)",
          }}
        >
          <p style={{ margin: 0, color: "#8a6a00", fontWeight: 900, letterSpacing: ".06em" }}>
            PSI SIGMA PHI PHILIPPINES INC.
          </p>
          <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(2rem, 5vw, 3rem)" }}>
            Data Privacy Notice
          </h1>
          <p style={{ margin: 0, color: "#756b5a" }}>Notice version: 2026-08-20-v1</p>

          <div style={{ display: "grid", gap: 24, marginTop: 32, lineHeight: 1.7 }}>
            <section>
              <h2>Purpose</h2>
              <p>
                Psi Sigma Phi Philippines Inc. collects and processes member and applicant
                information for legitimate membership administration, chapter assignment,
                identity verification, member communication, event administration, financial
                obligations and payments, certificate issuance, reporting, security, and related
                organizational operations.
              </p>
            </section>

            <section>
              <h2>Information collected during registration</h2>
              <p>
                The online membership application currently collects First Name, Last Name, MI,
                Address, Email, Mobile No., Date Survive, Location, PSP Birthday Code, Date of
                Birth, and selected Chapter. The system also records the application submission
                and required acknowledgements for administrative and audit purposes.
              </p>
            </section>

            <section>
              <h2>How information is used</h2>
              <p>
                Information is used only by authorized users and system processes according to
                their assigned National or Chapter responsibilities. Chapter-level administrators
                are restricted to information within their authorized scope unless explicit
                National permissions apply.
              </p>
            </section>

            <section>
              <h2>Protection and disclosure</h2>
              <p>
                The platform applies access controls, server-side authorization, secure transport,
                audit logging, and other technical and organizational safeguards. Personal data is
                not intended for unrestricted public display. Information may be shared with
                authorized service providers only when required to operate approved platform
                functions such as payment processing, hosting, storage, or communications.
              </p>
            </section>

            <section>
              <h2>Retention</h2>
              <p>
                Records are retained only for appropriate membership, administrative, financial,
                audit, security, legal, and organizational purposes. Historical membership and
                financial records that require traceability are archived rather than silently
                deleted.
              </p>
            </section>

            <section>
              <h2>Your privacy rights</h2>
              <p>
                Members and applicants may raise questions or requests concerning their personal
                information through the official Psi Sigma Phi Philippines Inc. contact channel.
                Requests will be handled according to applicable Philippine privacy requirements
                and the organization&apos;s approved privacy procedures.
              </p>
            </section>

            <section
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #f0df9b",
                background: "#fff9df",
              }}
            >
              <strong>Registration acknowledgement</strong>
              <p style={{ marginBottom: 0 }}>
                Before an online membership application can be submitted, the applicant must
                actively tick the Data Privacy acknowledgement checkbox. The application audit
                record stores the privacy notice version acknowledged at submission time.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
