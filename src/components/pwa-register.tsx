"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (registration.waiting) setUpdateReady(true);

        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      } catch (error) {
        console.error("PWA service worker registration failed", error);
      }
    };

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    void register();

    if (!isStandalone() && isIos()) {
      const dismissed = sessionStorage.getItem("psp-ios-install-dismissed");
      setShowIosHelp(!dismissed);
    }

    return () => window.removeEventListener("beforeinstallprompt", beforeInstall);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function refreshForUpdate() {
    window.location.reload();
  }

  if (isStandalone()) return null;

  if (updateReady) {
    return (
      <div style={bannerStyle} role="status">
        <div>
          <strong>PSP update available</strong>
          <div style={subtleStyle}>Refresh to use the latest secure version.</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={refreshForUpdate}>
          Refresh
        </button>
      </div>
    );
  }

  if (installPrompt) {
    return (
      <div style={bannerStyle} role="status">
        <div>
          <strong>Install PSP Philippines</strong>
          <div style={subtleStyle}>Add the member PWA to your phone for faster access.</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={install}>
          Install App
        </button>
      </div>
    );
  }

  if (showIosHelp) {
    return (
      <div style={bannerStyle} role="status">
        <div>
          <strong>Install on iPhone/iPad</strong>
          <div style={subtleStyle}>In Safari, tap Share, then choose Add to Home Screen.</div>
        </div>
        <button
          type="button"
          className="btn"
          style={{ background: "#fff", border: "1px solid #ddd5c1" }}
          onClick={() => {
            sessionStorage.setItem("psp-ios-install-dismissed", "1");
            setShowIosHelp(false);
          }}
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  left: "max(12px, env(safe-area-inset-left))",
  right: "max(12px, env(safe-area-inset-right))",
  bottom: "max(12px, env(safe-area-inset-bottom))",
  maxWidth: 680,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  background: "#151515",
  color: "#fff",
  boxShadow: "0 14px 38px rgba(0,0,0,.26)",
};

const subtleStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#d7d1c5",
  fontSize: ".82rem",
  lineHeight: 1.4,
};
