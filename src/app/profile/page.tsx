import Link from "next/link";
import { redirect } from "next/navigation";
import { PasskeySettings } from "@/components/member/passkey-settings";
import { ProfileForm } from "@/components/member/profile-form";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function inputDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function ProfilePage() {
  let member;
  try {
    ({ member } = await requireCurrentMember());
  } catch {
    redirect("/login");
  }

  const passkeys = await prisma.passkeyCredential.findMany({
    where: { userId: member.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

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

      <div className="container app-main" style={{ maxWidth: 1000 }}>
        <div className="app-greeting">
          <p>My Profile & Security</p>
          <h1>{fullName}</h1>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <section className="app-panel">
            <h2>Protected Membership Record</h2>
            <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
              Your assigned chapter and PSP identity codes are controlled membership records and cannot be changed from self-service.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              <Info label="Membership No." value={member.membershipNo} />
              <Info label="Chapter" value={member.chapter.name} />
              <Info label="PSP Birthday Code" value={member.pspBirthdayCode ?? "Not recorded"} />
              <Info label="Login Email" value={member.user.email} />
            </div>
          </section>

          <div className="app-grid">
            <section className="app-panel">
              <h2>Personal Record</h2>
              <p style={{ color: "#6b665c", lineHeight: 1.6 }}>
                Keep your personal information current. Updates are audited and do not change your chapter or PSP identity codes.
              </p>
              <ProfileForm
                initial={{
                  firstName: member.firstName,
                  lastName: member.lastName,
                  middleInitial: member.middleInitial ?? "",
                  mobile: member.mobile ?? "",
                  address: member.address ?? "",
                  dateSurvive: inputDate(member.dateSurvive),
                  surviveLocation: member.surviveLocation ?? "",
                  birthDate: inputDate(member.birthDate),
                }}
              />
            </section>

            <aside className="app-panel">
              <PasskeySettings
                initialPasskeys={passkeys.map((passkey) => ({
                  ...passkey,
                  createdAt: passkey.createdAt.toISOString(),
                  lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
                }))}
              />
            </aside>
          </div>
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
