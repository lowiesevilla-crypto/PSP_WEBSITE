import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./application.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Psi Sigma Phi Philippines Inc.",
    template: "%s | Psi Sigma Phi Philippines Inc.",
  },
  description:
    "Official digital membership platform for Psi Sigma Phi Philippines Inc.",
  applicationName: "PSP Philippines",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/psp-logo.jpg", type: "image/jpeg" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/psp-logo.jpg", type: "image/jpeg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PSP Philippines",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
