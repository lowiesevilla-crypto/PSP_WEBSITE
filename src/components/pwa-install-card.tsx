"use client";

import { useEffect, useState } from "react";
import {
  clearCapturedPspInstallPrompt,
  getCapturedPspInstallPrompt,
  PSP_APP_INSTALLED,
  PSP_INSTALL_PROMPT_READY,
} from "@/components/pwa-register";

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

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasInstalledByThisBrowser() {
  try {
    return window.localStorage.getItem("psp-pwa-installed") === "1";
  } catch {
    return false;
  }
}

function rememberInstalled() {
  try {
    window.localStorage.setItem("psp-pwa-installed", "1");
  } catch {
    // Browser installability remains authoritative if storage is unavailable.
  }
}

export function PwaInstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIos(isIosDevice());

    const captured = getCapturedPspInstallPrompt();
    if (captured) {
      setPrompt(captured);
      setInstalled(false);
    } else {
      setInstalled(isStandalone() || wasInstalledByThisBrowser());
    }

    const syncPrompt = () => {
      const nextPrompt = getCapturedPspInstallPrompt();
      if (nextPrompt) {
        setPrompt(nextPrompt);
        setInstalled(false);
        setMessage(null);
      }
    };

    const directPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as InstallPromptEvent;
      setPrompt(installEvent);
      setInstalled(false);
      setMessage(null);
    };

    const markInstalled = () => {
      rememberInstalled();
      clearCapturedPspInstallPrompt();
      setPrompt(null);
      setInstalled(true);
      setBusy(false);
      setMessage("PSP Mobile App was installed successfully on this device.");
    };

    window.addEventListener(PSP_INSTALL_PROMPT_READY, syncPrompt);
    window.addEventListener("beforeinstallprompt", directPrompt);
    window.addEventListener(PSP_APP_INSTALLED, markInstalled);
    window.addEventListener("appinstalled", markInstalled);

    return () => {
      window.removeEventListener(PSP_INSTALL_PROMPT_READY, syncPrompt);
      window.removeEventListener("beforeinstallprompt", directPrompt);
      window.removeEventListener(PSP_APP_INSTALLED, markInstalled);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    const activePrompt = prompt ?? getCapturedPspInstallPrompt();
    if (!activePrompt) {
      setShowManualHelp(true);
      setMessage(
        ios
          ? "iPhone and iPad require Safari → Share → Add to Home Screen. Apple does not allow a website to install a PWA silently."
          : "The browser has not offered its native install prompt. Open this page in Chrome or Edge, then choose Install app / Add to Home screen from the browser menu.",
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await activePrompt.prompt();
      const result = await activePrompt.userChoice;
      if (result.outcome === "accepted") {
        rememberInstalled();
        clearCapturedPspInstallPrompt();
        setPrompt(null);
        setInstalled(true);
        setMessage("PSP Mobile App installation was accepted. Open PSP from your Home Screen or app launcher.");
      } else {
        setMessage("Installation was cancelled. You can tap Install PSP App again whenever you are ready.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (installed && !prompt) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={statusStyle} role="status">
          <strong>✓ PSP Mobile App is already installed</strong>
          <span style={{ color: "#d9d2c3" }}>
            Use the PSP icon on your Home Screen or app launcher. This page will not create another PSP app while this browser still recognizes the existing installation.
          </span>
        </div>
        <a className="btn btn-primary" href="/member" style={{ width: "100%", minHeight: 54, fontWeight: 900 }}>
          Open PSP Member Portal
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <button
        className="btn btn-primary"
        type="button"
        disabled={busy}
        onClick={() => void install()}
        style={{ width: "100%", minHeight: 58, fontWeight: 900, fontSize: "1rem" }}
      >
        {busy ? "Opening Installer…" : prompt ? "Install PSP App" : ios ? "Install PSP on iPhone / iPad" : "Install PSP App"}
      </button>

      <div style={primaryInstructionStyle}>
        <strong>{prompt ? "Ready to install" : "Official PSP install"}</strong>
        <span>
          {prompt
            ? "Tap Install PSP App. Your phone/browser will open its native installation confirmation."
            : ios
              ? "Safari requires one final Apple step: Share → Add to Home Screen → Add."
              : "PSP is a Progressive Web App. If your browser supports direct PWA installation, its native install confirmation appears when available."}
        </span>
      </div>

      {(showManualHelp || ios || !prompt) ? (
        <div style={instructionStyle}>
          <strong>{ios ? "iPhone / iPad" : "Android / Chrome / Edge"}</strong>
          <span>
            {ios
              ? "Open this page in Safari → tap Share → choose Add to Home Screen → Add. iOS does not permit websites to silently install an app."
              : prompt
                ? "Tap Install PSP App above, then confirm the browser's installation dialog."
                : "Use Chrome or Edge. Open the browser menu and choose Install app / Add to Home screen if the native prompt is not currently available."}
          </span>
        </div>
      ) : null}

      <div style={instructionStyle}>
        <strong>One official PSP app identity</strong>
        <span>
          PSP uses one stable web-app identity from psp.hoahub.tech. Supported browsers normally recognize an existing installation and do not offer a second copy for the same app identity.
        </span>
      </div>

      <div style={instructionStyle}>
        <strong>No APK or App Store package is required</strong>
        <span>
          PSP is a secure installable PWA. The browser installs it directly from the official PSP website and updates it automatically.
        </span>
      </div>

      {message ? (
        <div role="status" aria-live="polite" style={messageStyle}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

const primaryInstructionStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 16,
  border: "1px solid #dfc76f",
  borderRadius: 14,
  background: "#fff9e8",
  color: "#342e22",
  lineHeight: 1.55,
};

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
  gap: 6,
  padding: 16,
  borderRadius: 16,
  background: "#151515",
  color: "#FEC009",
  lineHeight: 1.55,
};

const messageStyle: React.CSSProperties = {
  padding: 13,
  borderRadius: 12,
  background: "#f4f1e9",
  color: "#514b41",
  lineHeight: 1.5,
};
