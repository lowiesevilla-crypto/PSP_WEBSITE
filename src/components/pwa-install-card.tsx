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

type Platform = "ios" | "android" | "other";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
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
  const [platform, setPlatform] = useState<Platform>("other");
  const [iosSafari, setIosSafari] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);
    setIosSafari(currentPlatform === "ios" && isIosSafari());

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
    if (platform === "ios") {
      setShowManualHelp(true);
      setMessage(
        iosSafari
          ? "On iPhone/iPad, tap Safari's Share button, choose Add to Home Screen, then tap Add. Apple requires this confirmation step."
          : "Open this page in Safari on your iPhone/iPad, then tap Share → Add to Home Screen → Add.",
      );
      return;
    }

    const activePrompt = prompt ?? getCapturedPspInstallPrompt();
    if (!activePrompt) {
      setShowManualHelp(true);
      setMessage(
        platform === "android"
          ? "If the native prompt is unavailable, use the Android installer download when shown below or open Chrome/Edge menu → Install app / Add to Home screen."
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

  const primaryLabel =
    platform === "ios"
      ? "Install PSP on iPhone / iPad"
      : busy
        ? "Opening Installer…"
        : "Install PSP App";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <button
        className="btn btn-primary"
        type="button"
        disabled={busy}
        onClick={() => void install()}
        style={{ width: "100%", minHeight: 58, fontWeight: 900, fontSize: "1rem" }}
      >
        {primaryLabel}
      </button>

      <div style={primaryInstructionStyle}>
        <strong>
          {platform === "ios"
            ? "iPhone / iPad compatible"
            : prompt
              ? "Ready to install"
              : platform === "android"
                ? "Android installer"
                : "Official PSP install"}
        </strong>
        <span>
          {platform === "ios"
            ? "PSP is installable on iPhone and iPad as a secure Home Screen web app. Your Digital ID, payments, receipts, certificates, chapter updates and passkey-capable login remain available from the same PSP account."
            : prompt
              ? "Tap Install PSP App. Your phone/browser will open its native installation confirmation."
              : platform === "android"
                ? "Android supports the PSP native installer package and the browser PWA install flow. Both use the same PSP website account and backend."
                : "PSP is a Progressive Web App. Supported browsers can install it directly from the official PSP website."}
        </span>
      </div>

      {platform === "ios" ? (
        <div style={instructionStyle}>
          <strong>Install on iPhone / iPad</strong>
          <span>
            {iosSafari
              ? "1. Tap Safari's Share button. 2. Choose Add to Home Screen. 3. Tap Add. PSP then opens from its Home Screen icon in standalone mode."
              : "Open psp.hoahub.tech/install in Safari first. Then tap Share → Add to Home Screen → Add."}
          </span>
          <span style={{ color: "#6b665c" }}>
            iOS does not allow a website to silently install an unsigned IPA. A native iOS App Store/TestFlight package requires Apple Developer signing; the current PSP iPhone/iPad distribution remains the supported installable PWA until that Apple signing channel is configured.
          </span>
        </div>
      ) : null}

      {(showManualHelp || (platform !== "ios" && !prompt)) ? (
        <div style={instructionStyle}>
          <strong>{platform === "android" ? "Android / Chrome / Edge" : "Browser installation"}</strong>
          <span>
            {platform === "android"
              ? prompt
                ? "Tap Install PSP App above, then confirm the browser's installation dialog."
                : "Use Chrome or Edge. If the native prompt is unavailable, use the PSP Android APK installer once the signed package is published, or choose Install app / Add to Home screen from the browser menu."
              : "Use a browser that supports PWA installation, then choose Install app / Add to Home screen."}
          </span>
        </div>
      ) : null}

      <div style={instructionStyle}>
        <strong>One PSP account across Android and iOS</strong>
        <span>
          Android and iPhone/iPad installations connect to the same psp.hoahub.tech service, membership record, Digital ID, payments, certificates and notifications. Installing on another platform does not create another PSP member account.
        </span>
      </div>

      <div style={instructionStyle}>
        <strong>One official PSP app identity per platform</strong>
        <span>
          The web app keeps one stable PSP identity. The Android package also uses one stable application ID so future signed Android updates replace the existing PSP Android app instead of creating another copy.
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
