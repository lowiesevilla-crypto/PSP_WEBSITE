import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/member/profile-form";
import { requireCurrentMember } from "@/lib/member/current-member";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default async function ProfilePage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const fullName = [member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ");

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="container app-nav">
          <Link className="app-brand" href="/member">
            <img src="/brand/psp-logo.jpg" alt="Psi Sigma Phi seal" />
            <span>PSP Philippines</span>
          </Link>
          <Link href="/member" className="btn" style={{ background: "#fff", border: "1px solid #ddd5c1" }}>
            Dashboard
          </Link>
        </div>
      </header>

      <div className="container app-main">
        <div className="app-greeting">
          <p>My Profile</p>
          <h1>{fullName}</h1>
        </div>

        <div className="app-grid">
          <section className="app-panel">
            <h2>Verified Membership Information</h2>
            <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
              These fields are part of your verified PSP membership record. Contact an authorized chapter administrator if a verified field requires correction.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              <Info label="Membership No." value={member.membershipNo} />
              <Info label="Chapter" value={member.chapter.name} />
              <Info label="Email" value={member.user.email} />
              <Info label="Date Survive" value={formatDate(member.dateSurvive)} />
              <Info label="Location" value={member.surviveLocation ?? "Not recorded"} />
              <Info label="PSP Birthday Code" value={member.pspBirthdayCode ?? "Not recorded"} />
              <Info label="Date of Birth" value={formatDate(member.birthDate)} />
            </div>
          </section>

          <aside className="app-panel">
            <h2>Contact Information</h2>
            <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
              You may update your current mobile number and address.
            </p>
            <ProfileForm mobile={member.mobile} address={member.address} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 14, border: "1px solid #e6e0d2", borderRadius: 14, background: "#fff" }}>
      <small style={{ display: "block", color: "#776e5e", marginBottom: 5 }}>{label}</small>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
