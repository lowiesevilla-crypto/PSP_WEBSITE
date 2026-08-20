import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://psp.hoahub.tech").replace(/\/$/, "");
}

export function certificateVerificationUrl(token: string) {
  return `${appOrigin()}/verify/${encodeURIComponent(token)}`;
}

function fitText(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

export async function generateMembershipCertificatePdf(input: {
  memberName: string;
  membershipNo: string;
  chapterName: string;
  certificateNumber: string;
  issuedAt: Date;
  verificationToken: string;
}) {
  const document = await PDFDocument.create();
  const page = document.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const serif = await document.embedFont(StandardFonts.TimesRoman);
  const serifBold = await document.embedFont(StandardFonts.TimesRomanBold);
  const sans = await document.embedFont(StandardFonts.Helvetica);

  const black = rgb(0.06, 0.06, 0.06);
  const gold = rgb(0.996, 0.753, 0.035);
  const muted = rgb(0.35, 0.35, 0.35);

  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderWidth: 3, borderColor: black });
  page.drawRectangle({ x: 27, y: 27, width: width - 54, height: height - 54, borderWidth: 1.5, borderColor: gold });

  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "brand", "psp-logo.jpg"));
    const logo = await document.embedJpg(logoBytes);
    page.drawImage(logo, { x: width / 2 - 44, y: height - 132, width: 88, height: 88 });
  } catch {
    // Certificate remains valid if the optional embedded logo asset is temporarily unavailable.
  }

  const centerText = (text: string, y: number, size: number, font = serif, color = black) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  };

  centerText("PSI SIGMA PHI PHILIPPINES INC.", height - 160, 18, serifBold);
  centerText("CERTIFICATE OF MEMBERSHIP", height - 198, 28, serifBold, black);
  centerText("This is to certify that", height - 238, 13, serif, muted);
  centerText(fitText(input.memberName.toUpperCase(), 58), height - 286, 30, serifBold, black);
  centerText(`Membership No. ${input.membershipNo}`, height - 316, 12, sans, muted);
  centerText("is recorded as an active member of", height - 350, 13, serif, muted);
  centerText(fitText(input.chapterName, 70), height - 383, 20, serifBold, black);
  centerText("Psi Sigma Phi Philippines Inc.", height - 411, 13, serif, muted);

  const issueDate = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(input.issuedAt);

  page.drawText(`Certificate No.: ${input.certificateNumber}`, { x: 56, y: 76, size: 10, font: sans, color: muted });
  page.drawText(`Issued: ${issueDate}`, { x: 56, y: 58, size: 10, font: sans, color: muted });
  page.drawText("Authorized digital certificate", { x: width / 2 - 88, y: 66, size: 10, font: sans, color: muted });

  const verificationUrl = certificateVerificationUrl(input.verificationToken);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 240 });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
  const qr = await document.embedPng(qrBytes);
  page.drawImage(qr, { x: width - 134, y: 48, width: 72, height: 72 });
  page.drawText("Scan to verify", { x: width - 125, y: 34, size: 8, font: sans, color: muted });

  return document.save();
}
