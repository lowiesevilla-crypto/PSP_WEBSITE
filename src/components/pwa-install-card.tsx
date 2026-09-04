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
  const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(ua) || ipadDesktopMode) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

function isInAppBrowser() {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|MicroMessenger/i.test(navigator.userAgent);
}

export function PwaInstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [iosSafari, setIosSafari] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);
    setIosSafari(currentPlatform === "ios" && isIosSafari());
    setInAppBrowser(isInAppBrowser());
    setInstalled(isStandalone());

    const captured = getCapturedPspInstallPrompt();
    if (captured) setPrompt(captured);

    const syncPrompt = () => {
      const nextPrompt = getCapturedPspInstallPrompt();
      if (nextPrompt) {
        setPrompt(nextPrompt);
        setMessage(null);
      }
    };

    const directPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setMessage(null);
    };

    const markInstalled = () => {
      clearCapturedPspInstallPrompt();
      setPrompt(null);
      setInstalled(true);
      setBusy(false);
      setMessage("PSP was added to this device. Open it from your Home Screen or app launcher.");
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
    if (installed) {
      window.location.href = "/member";
      return;
    }

    if (inAppBrowser) {
      setMessage(
        platform === "ios"
          ? "Open this page in Safari first, then tap Share → Add to Home Screen → Add."
          : "Open this page in Chrome or Samsung Internet first, then tap Install PSP App again.",
      );
      return;
    }

    if (platform === "ios") {
      setMessage(
        iosSafari
          ? "Tap Safari's Share button, choose Add to Home Screen, then tap Add. PSP will appear on your Home Screen."
          : "Open this page in Safari, then tap Share → Add to Home Screen → Add.",
      );
      return;
    }

    const activePrompt = prompt ?? getCapturedPspInstallPrompt();
    if (!activePrompt) {
      setMessage(
        platform === "android"
          ? "Open your browser menu and choose Install app or Add to Home screen. This adds the same official PSP app to your phone."
          : "Use your browser menu and choose Install app or Add to Home screen.",
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await activePrompt.prompt();
      const result = await activePrompt.userChoice;
      if (result.outcome === "accepted") {
        clearCapturedPspInstallPrompt();
        setPrompt(null);
        setInstalled(true);
        setMessage("PSP installation was accepted. Open PSP from your Home Screen or app launcher.");
      } else {
        setMessage("Installation was cancelled. Tap Install PSP App when you are ready.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (installed) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={statusStyle} role="status">
          <strong>✓ PSP is installed</strong>
          <span style={{ color: "#d9d2c3" }}>Open PSP from your Home Screen or app launcher.</span>
        </div>
        <a className="btn btn-primary" href="/member" style={{ width: "100%", minHeight: 56, fontWeight: 900 }}>
          Open PSP
        </a>
      </div>
    );
  }

  const buttonLabel =
    platform === "ios"
      ? "Add PSP to Home Screen"
      : busy
        ? "Opening Install…"
        : "Install PSP App";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <button
        className="btn btn-primary"
        type="button"
        disabled={busy}
        onClick={() => void install()}
        style={{ width: "100%", minHeight: 60, fontWeight: 900, fontSize: "1.02rem" }}
      >
        {buttonLabel}
      </button>

      {inAppBrowser ? (
        <div style={noticeStyle}>
          <strong>Open PSP in your phone browser</strong>
          <span>
            {platform === "ios"
              ? "Messenger, Facebook and other in-app browsers cannot add a PWA correctly. Open psp.hoahub.tech/install in Safari."
              : "Messenger, Facebook and other in-app browsers may hide the install option. Open psp.hoahub.tech/install in Chrome or Samsung Internet."}
          </span>
        </div>
      ) : platform === "ios" ? (
        <div style={instructionStyle}>
          <strong>iPhone / iPad</strong>
          <span>Safari → Share → Add to Home Screen → Add.</span>
        </div>
      ) : (
        <div style={instructionStyle}>
          <strong>Android</strong>
          <span>
            {prompt
              ? "Tap Install PSP App above and confirm the browser installation prompt."
              : "If no prompt appears, open the browser menu → Install app / Add to Home screen."}
          </span>
        </div>
      )}

      <div style={instructionStyle}>
        <strong>One PSP app</strong>
        <span>PSP uses one stable web-app identity. Installing it again from the same official site should update or reopen the same app instead of creating a different PSP account.</span>
      </div>

      {message ? (
        <div role="status" aria-live="polite" style={messageStyle}>
          {message}
        </div>
      ) : null}
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

const noticeStyle: React.CSSProperties = {
  ...instructionStyle,
  borderColor: "#dfc76f",
  background: "#fff9e8",
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
