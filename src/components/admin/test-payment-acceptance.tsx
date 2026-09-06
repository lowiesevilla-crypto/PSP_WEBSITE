"use client";

import { FormEvent, useState } from "react";

type Chapter = { id: string; name: string; code: string };
type ConfigPayload = {
  config: null | {
    mode: "TEST" | "LIVE";
    linkedAccountId: string | null;
    paymentMethods: unknown;
    isEnabled: boolean;
    hasWebhookSecret: boolean;
  };
  platformMode?: "TEST" | "LIVE" | null;
  platformReady?: boolean;
  activationBlockers?: string[];
  message?: string;
};

type Method = "qrph" | "gcash" | "paymaya";

function methodsFrom(value: unknown): Method[] {
  if (!Array.isArray(value)) return ["qrph"];
  const allowed = new Set<Method>(["qrph", "gcash", "paymaya"]);
  const methods = value.filter((item): item is Method => typeof item === "string" && allowed.has(item as Method));
  return methods.length ? methods : ["qrph"];
}

export function TestPaymentAcceptance({ chapters }: { chapters: Chapter[] }) {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [membershipNo, setMembershipNo] = useState("");
  const [amount, setAmount] = useState("10.00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function activateTestMode() {
    if (!chapterId || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/finance/payment-config?chapterId=${encodeURIComponent(chapterId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ConfigPayload | null;
      if (!response.ok || !payload) throw new Error(payload?.message ?? "Unable to load Chapter payment configuration.");
      if (payload.platformMode !== "TEST") {
        throw new Error(`PSP parent PayMongo mode must be TEST before controlled testing. Current mode: ${payload.platformMode ?? "not ready"}.`);
      }
      if (!payload.config?.linkedAccountId) {
        throw new Error("Save the Chapter PayMongo linked child Account ID first.");
      }
      if (payload.config.mode !== "TEST") {
        throw new Error("Save the Chapter PayMongo mode as TEST first.");
      }
      if (payload.config.isEnabled && payload.config.hasWebhookSecret) {
        setMessage("Chapter TEST online payment is already enabled and its child webhook is configured. You may create controlled TEST dues below.");
        return;
      }
      const blockers = Array.isArray(payload.activationBlockers) ? payload.activationBlockers : [];
      if (blockers.length) throw new Error(blockers.join(" "));

      const activate = await fetch("/api/admin/finance/payment-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          chapterId,
          mode: "TEST",
          linkedAccountId: payload.config.linkedAccountId,
          paymentMethods: methodsFrom(payload.config.paymentMethods),
          isEnabled: true,
        }),
      });
      const activated = (await activate.json().catch(() => null)) as ConfigPayload | null;
      if (!activate.ok || !activated?.config?.isEnabled || !activated.config.hasWebhookSecret) {
        throw new Error(activated?.message ?? "Unable to activate Chapter TEST online payment.");
      }
      setMessage("TEST online payment is enabled. PSP created/stored the Chapter TEST child webhook signing secret. Member payment controls can now become available.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to activate TEST online payment.");
    } finally {
      setBusy(false);
    }
  }

  async function createTestDues(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || !membershipNo.trim() || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/finance/test-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ chapterId, membershipNo: membershipNo.trim(), amount: Number(amount) }),
      });
      const payload = await response.json().catch(() => null) as { message?: string; title?: string; amount?: string; member?: { membershipNo: string; name: string } } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to create controlled TEST dues.");
      setMessage(`${payload?.message ?? "Controlled TEST dues created."} ${payload?.member?.name ?? "Member"} (${payload?.member?.membershipNo ?? membershipNo}) · ₱${payload?.amount ?? amount}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create controlled TEST dues.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }} data-test-payment-acceptance-version="controlled-test-v1">
      <section className="app-panel" style={{ border: "1px solid #ebd594", background: "#fffaf0" }}>
        <small style={{ color: "#806500", fontWeight: 900 }}>CONTROLLED PAYMONGO TEST ACCEPTANCE</small>
        <h2 style={{ margin: "5px 0 8px" }}>1. Activate Chapter TEST Online Payment</h2>
        <p style={{ margin: "0 0 12px", color: "#6b665c", lineHeight: 1.55 }}>
          Saving Mode = TEST is only a disabled draft. This action uses the already-saved Chapter Account ID and payment methods, requires the PSP parent platform to be TEST, creates the child TEST webhook when needed, and enables member TEST payments. It does not enable LIVE processing.
        </p>
        <label>Chapter
          <select value={chapterId} onChange={(event) => setChapterId(event.target.value)} disabled={busy}>
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} · {chapter.code}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void activateTestMode()} disabled={busy || !chapterId} style={{ marginTop: 12 }}>
          {busy ? "Working…" : "Activate / Verify TEST Online Payment"}
        </button>
      </section>

      <form className="app-panel" onSubmit={createTestDues}>
        <small style={{ color: "#806500", fontWeight: 900 }}>SINGLE-MEMBER TEST LEDGER</small>
        <h2 style={{ margin: "5px 0 8px" }}>2. Create Controlled TEST Monthly Dues</h2>
        <p style={{ margin: "0 0 12px", color: "#6b665c", lineHeight: 1.55 }}>
          This creates a clearly labeled [TEST] Monthly Dues assessment and one CHARGE ledger entry for the specified active member only. Other Chapter members are not charged. Use a small amount such as ₱10.00, then complete the payment using PayMongo TEST helpers.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          <label>Membership No.
            <input value={membershipNo} onChange={(event) => setMembershipNo(event.target.value)} required maxLength={100} placeholder="e.g. PSP-..." />
          </label>
          <label>TEST Dues Amount (PHP)
            <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" max="1000" step="0.01" required />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || !chapterId || !membershipNo.trim()} style={{ marginTop: 12 }}>
          {busy ? "Creating…" : "Create Single-Member TEST Dues"}
        </button>
      </form>

      {message ? <div role="status" style={{ padding: 12, border: "1px solid #bcdcbc", background: "#eef8ef", color: "#245b2a", borderRadius: 12, lineHeight: 1.5 }}>{message}</div> : null}
      {error ? <div role="alert" style={{ padding: 12, border: "1px solid #e8b5b5", background: "#fff1f1", color: "#7b2424", borderRadius: 12, lineHeight: 1.5 }}>{error}</div> : null}

      <section className="app-panel">
        <h2 style={{ marginTop: 0 }}>3. Run the Member TEST Payment</h2>
        <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
          <li>Sign out of Admin and sign in as the selected member.</li>
          <li>Open <strong>Payments</strong>. The [TEST] Monthly Dues should appear under Outstanding Dues & Assessments.</li>
          <li>Select QR Ph first and confirm the displayed Chapter amount, PSP platform fee and gross total.</li>
          <li>Use the PayMongo TEST helper. Do not use a real wallet or real money for the TEST QR.</li>
          <li>Wait for PSP to show PAID and generate a receipt. Then verify the Payment & Split Reconciliation register in Admin → Finance.</li>
        </ol>
      </section>
    </div>
  );
}
