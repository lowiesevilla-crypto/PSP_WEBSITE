import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { digitalIdVerificationUrl, ensureDigitalMemberId } from "@/lib/member/digital-id";
import { requireCurrentMember } from "@/lib/member/current-member";

export const dynamic = "force-dynamic";
export const metadata = { title: "Digital Member ID" };

export default async function DigitalMemberIdPage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const digitalId = await ensureDigitalMemberId(member.id);
  const verifyUrl = digitalIdVerificationUrl(digitalId.verificationToken);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 420 });
  const fullName = [member.firstName, member.middleInitial, member.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Digital ID</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>
            Dashboard
          </Link>
        </div>
      </header>

      <div className="container app-main" style={{ maxWidth: 760 }}>
        <div className="app-greeting">
          <p>Verified Membership</p>
          <h1>My Digital ID</h1>
        </div>

        <section
          aria-label="Psi Sigma Phi digital membership card"
          style={{
            overflow: "hidden",
            borderRadius: 24,
            border: "1px solid #2a260e",
            background: "linear-gradient(145deg,#050505 0%,#181818 64%,#2c2200 100%)",
            color: "#fff",
            boxShadow: "0 24px 60px rgba(0,0,0,.25)",
          }}
        >
          <div style={{ height: 8, background: "#FEC009" }} />
          <div style={{ padding: "clamp(20px,5vw,34px)", display: "grid", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <img
                  src="/brand/psp-logo.jpg"
                  alt="Psi Sigma Phi seal"
                  style={{ width: 68, height: 68, objectFit: "contain", borderRadius: "50%", background: "#fff" }}
                />
                <div>
                  <div style={{ color: "#FEC009", fontWeight: 900, letterSpacing: ".12em", fontSize: ".78rem" }}>Ψ Σ Φ</div>
                  <strong style={{ display: "block", marginTop: 3 }}>Psi Sigma Phi Philippines Inc.</strong>
                </div>
              </div>
              <span style={{ borderRadius: 999, padding: "7px 10px", background: "rgba(254,192,9,.14)", color: "#FEC009", fontWeight: 900, fontSize: ".76rem" }}>
                {member.membershipStatus}
              </span>
            </div>

            <div>
              <small style={{ color: "#c8c1ad" }}>Member</small>
              <h2 style={{ margin: "5px 0 0", fontSize: "clamp(1.5rem,6vw,2.2rem)" }}>{fullName}</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              <div><small style={{ color: "#c8c1ad" }}>Membership No.</small><strong style={{ display: "block", marginTop: 4 }}>{member.membershipNo}</strong></div>
              <div><small style={{ color: "#c8c1ad" }}>Chapter</small><strong style={{ display: "block", marginTop: 4 }}>{member.chapter.name}</strong></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 130px", alignItems: "end", gap: 18 }}>
              <div>
                <small style={{ color: "#c8c1ad" }}>Digital verification</small>
                <p style={{ color: "#e6dfcc", margin: "6px 0 0", lineHeight: 1.5, fontSize: ".85rem" }}>
                  Scan the QR code to verify this member ID directly against the official PSP platform.
                </p>
              </div>
              <div style={{ background: "#fff", padding: 8, borderRadius: 15 }}>
                <img src={qrDataUrl} alt="Digital member ID verification QR code" style={{ display: "block", width: "100%", height: "auto" }} />
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel" style={{ marginTop: 18 }}>
          <h2>Verification Link</h2>
          <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
            Anyone scanning the QR sees only the minimum membership information required to confirm validity.
          </p>
          <a href={verifyUrl} className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
            Open Verification Page
          </a>
        </section>
      </div>
    </main>
  );
}
