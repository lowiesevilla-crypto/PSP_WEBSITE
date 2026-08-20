"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

interface ChapterOption {
  id: string;
  code: string;
  name: string;
}

interface RegistrationState {
  firstName: string;
  lastName: string;
  middleInitial: string;
  address: string;
  email: string;
  mobile: string;
  dateSurvive: string;
  surviveLocation: string;
  pspBirthdayCode: string;
  birthDate: string;
  chapterId: string;
  website: string;
}

const initialState: RegistrationState = {
  firstName: "",
  lastName: "",
  middleInitial: "",
  address: "",
  email: "",
  mobile: "",
  dateSurvive: "",
  surviveLocation: "",
  pspBirthdayCode: "",
  birthDate: "",
  chapterId: "",
  website: "",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "11px 13px",
  border: "1px solid #dcd4c0",
  borderRadius: 12,
  background: "#fff",
  color: "#151515",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 7,
};

const labelTextStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: ".86rem",
};

const acknowledgementStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 11,
  padding: 16,
  border: "1px solid #e1dac8",
  borderRadius: 15,
  background: "#fffcf4",
  lineHeight: 1.55,
};

export function RegistrationWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegistrationState>(initialState);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [applicationAcknowledged, setApplicationAcknowledged] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadChapters() {
      try {
        const response = await fetch("/api/public/chapters", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error("Unable to load chapters.");

        const payload = (await response.json()) as { chapters?: ChapterOption[] };
        setChapters(payload.chapters ?? []);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError("We could not load the chapter list. Please try again.");
        }
      } finally {
        setChaptersLoading(false);
      }
    }

    void loadChapters();
    return () => controller.abort();
  }, []);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === form.chapterId),
    [chapters, form.chapterId],
  );

  function update<K extends keyof RegistrationState>(
    field: K,
    value: RegistrationState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError("First Name and Last Name are required.");
        return false;
      }
      if (!form.address.trim()) {
        setError("Address is required.");
        return false;
      }
    }

    if (step === 2) {
      const requiredValues = [
        form.email,
        form.mobile,
        form.dateSurvive,
        form.surviveLocation,
        form.pspBirthdayCode,
        form.birthDate,
      ];
      if (requiredValues.some((value) => !value.trim())) {
        setError(
          "Email, Mobile No., Date Survive, Location, PSP Birthday Code, and Date of Birth are required.",
        );
        return false;
      }
    }

    if (step === 3 && !form.chapterId) {
      setError("Please select the chapter for your membership application.");
      return false;
    }

    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    setError(null);
    setStep((current) => Math.min(4, current + 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!applicationAcknowledged) {
      setError("Please confirm that the membership application information is accurate.");
      return;
    }

    if (!privacyAcknowledged) {
      setError("Please acknowledge the Data Privacy Notice before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...form,
          applicationAcknowledged,
          privacyAcknowledged,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        application?: { id?: string };
      };

      if (!response.ok) {
        throw new Error(
          payload.message ?? "We could not submit your membership application.",
        );
      }

      setApplicationId(payload.application?.id ?? null);
      setStep(5);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your membership application.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 5) {
    return (
      <div className="app-panel">
        <div style={{ display: "grid", gap: 18, textAlign: "center", padding: "18px 8px" }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              margin: "0 auto",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "#fec009",
              color: "#090909",
              fontSize: "1.7rem",
              fontWeight: 900,
            }}
          >
            ✓
          </div>
          <div>
            <p style={{ margin: 0, color: "#746b5b", fontWeight: 800 }}>
              Application Submitted
            </p>
            <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>
              Your membership application is now for review.
            </h2>
          </div>
          <p style={{ maxWidth: 600, margin: "0 auto", color: "#6f6450", lineHeight: 1.65 }}>
            Submission does not yet mean active membership. An authorized chapter reviewer
            must review and approve the application before a member account and membership
            number are activated.
          </p>
          {applicationId ? (
            <div
              style={{
                width: "fit-content",
                maxWidth: "100%",
                margin: "0 auto",
                padding: "10px 14px",
                border: "1px solid #e7d999",
                borderRadius: 12,
                background: "#fff9df",
                overflowWrap: "anywhere",
              }}
            >
              <small style={{ display: "block", color: "#746b5b" }}>Application Reference</small>
              <strong>{applicationId}</strong>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const progress = `${step * 25}%`;

  return (
    <form className="app-panel" onSubmit={submitApplication} noValidate>
      <div style={{ display: "grid", gap: 22 }}>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong>Step {step} of 4</strong>
            <span style={{ color: "#776e5e", fontSize: ".82rem" }}>
              {step === 1 && "Member Information"}
              {step === 2 && "PSP Membership Information"}
              {step === 3 && "Chapter Selection"}
              {step === 4 && "Review & Acknowledgement"}
            </span>
          </div>
          <div
            style={{
              height: 8,
              marginTop: 11,
              borderRadius: 999,
              background: "#eee7d5",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: progress,
                height: "100%",
                background: "#fec009",
                transition: "width 180ms ease",
              }}
            />
          </div>
        </div>

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
          style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }}
        />

        {step === 1 ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
              }}
            >
              <label style={labelStyle}>
                <span style={labelTextStyle}>First Name *</span>
                <input
                  value={form.firstName}
                  onChange={(event) => update("firstName", event.target.value)}
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Last Name *</span>
                <input
                  value={form.lastName}
                  onChange={(event) => update("lastName", event.target.value)}
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  style={fieldStyle}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>MI</span>
                <input
                  value={form.middleInitial}
                  onChange={(event) => update("middleInitial", event.target.value)}
                  autoComplete="additional-name"
                  maxLength={10}
                  placeholder="M.I."
                  style={fieldStyle}
                />
              </label>
            </div>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Address *</span>
              <textarea
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                autoComplete="street-address"
                maxLength={500}
                rows={4}
                required
                style={{ ...fieldStyle, resize: "vertical", paddingTop: 13 }}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 14,
            }}
          >
            <label style={labelStyle}>
              <span style={labelTextStyle}>Email *</span>
              <input
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Mobile No. *</span>
              <input
                type="tel"
                inputMode="tel"
                value={form.mobile}
                onChange={(event) => update("mobile", event.target.value)}
                autoComplete="tel"
                maxLength={30}
                placeholder="09XX XXX XXXX"
                required
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Date Survive *</span>
              <input
                type="date"
                value={form.dateSurvive}
                onChange={(event) => update("dateSurvive", event.target.value)}
                required
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Location *</span>
              <input
                value={form.surviveLocation}
                onChange={(event) => update("surviveLocation", event.target.value)}
                maxLength={250}
                required
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>PSP Birthday Code *</span>
              <input
                value={form.pspBirthdayCode}
                onChange={(event) => update("pspBirthdayCode", event.target.value)}
                maxLength={100}
                required
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Date of Birth *</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => update("birthDate", event.target.value)}
                required
                style={fieldStyle}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "grid", gap: 15 }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Select Chapter *</span>
              <select
                value={form.chapterId}
                onChange={(event) => update("chapterId", event.target.value)}
                disabled={chaptersLoading}
                required
                style={fieldStyle}
              >
                <option value="">
                  {chaptersLoading ? "Loading chapters…" : "Select your chapter"}
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name} ({chapter.code})
                  </option>
                ))}
              </select>
            </label>
            {!chaptersLoading && chapters.length === 0 ? (
              <div
                role="status"
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: "#fff4e6",
                  border: "1px solid #f3d4ad",
                  color: "#6e4a1c",
                  lineHeight: 1.55,
                }}
              >
                No active chapters are currently available for online registration. Please
                contact an authorized Psi Sigma Phi administrator.
              </div>
            ) : null}
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#fffae9",
                border: "1px solid #f0df9b",
                lineHeight: 1.6,
              }}
            >
              <strong>Chapter selection is subject to review.</strong>
              <div style={{ marginTop: 4, color: "#6f6450", fontSize: ".9rem" }}>
                Selecting a chapter does not automatically establish membership. Chapter
                membership becomes official only after the authorized approval process.
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <ReviewItem
                label="Name"
                value={[form.firstName, form.middleInitial, form.lastName].filter(Boolean).join(" ")}
              />
              <ReviewItem label="Address" value={form.address} />
              <ReviewItem label="Email" value={form.email} />
              <ReviewItem label="Mobile No." value={form.mobile} />
              <ReviewItem label="Date Survive" value={form.dateSurvive} />
              <ReviewItem label="Location" value={form.surviveLocation} />
              <ReviewItem label="PSP Birthday Code" value={form.pspBirthdayCode} />
              <ReviewItem label="Date of Birth" value={form.birthDate} />
              <ReviewItem label="Chapter" value={selectedChapter?.name ?? "Not selected"} />
            </div>

            <label style={acknowledgementStyle}>
              <input
                type="checkbox"
                checked={applicationAcknowledged}
                onChange={(event) => setApplicationAcknowledged(event.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2, accentColor: "#fec009" }}
              />
              <span>
                I confirm that the information I provided is accurate. I understand that this
                submission creates a membership application for review and does not by itself
                establish active membership in Psi Sigma Phi Philippines Inc.
              </span>
            </label>

            <label style={acknowledgementStyle}>
              <input
                type="checkbox"
                checked={privacyAcknowledged}
                onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2, accentColor: "#fec009" }}
              />
              <span>
                I acknowledge that I have read and understood the{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ fontWeight: 800 }}>
                  Data Privacy Notice
                </a>{" "}
                and understand how my personal data will be collected, used, protected, retained,
                and processed for legitimate Psi Sigma Phi Philippines Inc. membership and chapter
                administration purposes.
              </span>
            </label>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            style={{
              padding: 13,
              borderRadius: 12,
              border: "1px solid #e8b5b5",
              background: "#fff1f1",
              color: "#7b2424",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={previousStep}
              className="btn"
              style={{ border: "1px solid #ddd5c1", background: "#fff" }}
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button type="button" onClick={nextStep} className="btn btn-primary">
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || !applicationAcknowledged || !privacyAcknowledged}
              className="btn btn-primary"
              style={{
                opacity:
                  submitting || !applicationAcknowledged || !privacyAcknowledged ? 0.6 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid #e6e0d2",
        borderRadius: 14,
        background: "#fff",
        minWidth: 0,
      }}
    >
      <small style={{ display: "block", marginBottom: 5, color: "#776e5e" }}>{label}</small>
      <strong style={{ overflowWrap: "anywhere" }}>{value || "Not provided"}</strong>
    </div>
  );
}
