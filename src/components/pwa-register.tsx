"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PspInstallWindow = Window & {
  __pspInstallPrompt?: InstallPromptEvent | null;
};

export const PSP_INSTALL_PROMPT_READY = "psp-install-prompt-ready";
export const PSP_APP_INSTALLED = "psp-app-installed";

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

function rememberInstalled() {
  try {
    window.localStorage.setItem("psp-pwa-installed", "1");
  } catch {
    // Storage can be unavailable in private/restricted browsing. The browser's
    // own installability rules remain authoritative.
  }
}

export function getCapturedPspInstallPrompt() {
  if (typeof window === "undefined") return null;
  return (window as PspInstallWindow).__pspInstallPrompt ?? null;
}

export function clearCapturedPspInstallPrompt() {
  if (typeof window === "undefined") return;
  (window as PspInstallWindow).__pspInstallPrompt = null;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [onInstallPage, setOnInstallPage] = useState(false);

  useEffect(() => {
    setOnInstallPage(window.location.pathname === "/install");

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      if (!("serviceWorker" in navigator)) return;
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
      const installEvent = event as InstallPromptEvent;
      (window as PspInstallWindow).__pspInstallPrompt = installEvent;
      setInstallPrompt(installEvent);
      window.dispatchEvent(new CustomEvent(PSP_INSTALL_PROMPT_READY));
    };

    const appInstalled = () => {
      rememberInstalled();
      clearCapturedPspInstallPrompt();
      setInstallPrompt(null);
      window.dispatchEvent(new CustomEvent(PSP_APP_INSTALLED));
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    void register();

    const captured = getCapturedPspInstallPrompt();
    if (captured) setInstallPrompt(captured);

    if (!isStandalone() && isIos()) {
      const dismissed = sessionStorage.getItem("psp-ios-install-dismissed");
      setShowIosHelp(!dismissed);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      rememberInstalled();
      clearCapturedPspInstallPrompt();
      setInstallPrompt(null);
    }
  }

  function refreshForUpdate() {
    window.location.reload();
  }

  if (isStandalone()) return null;

  // The dedicated /install page owns the complete install UX. Keep this root
  // component mounted there so it can capture beforeinstallprompt, but do not
  // render a second competing install banner.
  if (onInstallPage) return null;

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
          <div style={subtleStyle}>Add the official PSP app to this device for faster access.</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void install()}>
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
