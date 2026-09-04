"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaInstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const handler = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setPrompt(null);
      setInstalled(true);
    }
  }

  if (installed) {
    return (
      <div style={statusStyle}>
        <strong>PSP Mobile App is installed</strong>
        <span style={{ color: "#d9d2c3" }}>Open it from your phone or tablet Home Screen / app launcher.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {prompt ? (
        <button className="btn btn-primary" type="button" onClick={() => void install()} style={{ width: "100%", minHeight: 54, fontWeight: 900 }}>
          Install PSP Mobile App
        </button>
      ) : null}
      {ios ? (
        <div style={instructionStyle}>
          <strong>iPhone / iPad</strong>
          <span>Open this page in Safari → tap Share → choose <b>Add to Home Screen</b> → Add.</span>
        </div>
      ) : (
        <div style={instructionStyle}>
          <strong>Android / Chrome / Edge</strong>
          <span>{prompt ? "Tap Install PSP Mobile App above." : "Open the browser menu and choose Install app / Add to Home screen."}</span>
        </div>
      )}
      <div style={instructionStyle}>
        <strong>No app-store download required</strong>
        <span>PSP is a secure installable PWA. Updates arrive automatically from the official PSP website.</span>
      </div>
    </div>
  );
}

const instructionStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 14,
  border: "1px solid #e4dccb",
  borderRadius: 14,
  background: "#fff",
  color: "#403a31",
  lineHeight: 1.55,
};

const statusStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 16,
  borderRadius: 16,
  background: "#151515",
  color: "#FEC009",
};
