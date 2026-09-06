import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { privateMediaStorageKey } from "@/lib/content/media";
import { readPrivateFile } from "@/lib/storage/private-media";

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://psp.hoahub.tech").replace(/\/$/, "");
}

export function certificateVerificationUrl(token: string) {
  return `${appOrigin()}/verify/${encodeURIComponent(token)}`;
}

function fitText(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 4) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (words.length && lines.length === maxLines) {
    const joined = lines.join(" ");
    if (joined.length < text.trim().length) {
      lines[maxLines - 1] = fitText(lines[maxLines - 1], Math.max(12, lines[maxLines - 1].length - 1));
    }
  }
  return lines;
}

function safePublicAssetPath(value: string) {
  const publicRoot = path.resolve(process.cwd(), "public");
  const candidate = path.resolve(publicRoot, `.${value}`);
  if (!candidate.startsWith(`${publicRoot}${path.sep}`)) return null;
  return candidate;
}

async function certificateLogoPng(chapterLogoUrl: string | null) {
  let source: Buffer;
  const storageKey = privateMediaStorageKey(chapterLogoUrl);

  if (storageKey) {
    source = await readPrivateFile(storageKey);
  } else if (chapterLogoUrl?.startsWith("/")) {
    const publicPath = safePublicAssetPath(chapterLogoUrl);
    if (!publicPath) throw new Error("Invalid Chapter logo path.");
    source = await readFile(publicPath);
  } else if (chapterLogoUrl) {
    throw new Error("Chapter certificate logo must be uploaded to PSP managed storage.");
  } else {
    source = await readFile(path.join(process.cwd(), "public", "brand", "psp-logo.jpg"));
  }

  return sharp(source)
    .rotate()
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}

export async function generateMembershipCertificatePdf(input: {
  memberName: string;
  membershipNo: string;
  chapterName: string;
  chapterLogoUrl: string | null;
  certificateNumber: string;
  issuedAt: Date;
  verificationToken: string;
  signatoryName: string;
  signatoryTitle: string;
  certificateType?: string;
  title?: string;
  citationText?: string | null;
  certificateDate?: Date;
  referenceLabel?: string | null;
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

  const logoBytes = await certificateLogoPng(input.chapterLogoUrl);
  const logo = await document.embedPng(logoBytes);
  page.drawImage(logo, { x: width / 2 - 42, y: height - 126, width: 84, height: 84 });

  const centerText = (text: string, y: number, size: number, font = serif, color = black) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: Math.max(38, (width - textWidth) / 2), y, size, font, color });
  };

  const certificateType = (input.certificateType ?? "MEMBERSHIP").trim().toUpperCase();
  const title = fitText((input.title ?? "Certificate of Membership").trim(), 62);
  const isMembership = certificateType === "MEMBERSHIP";

  centerText("PSI SIGMA PHI PHILIPPINES INC.", height - 154, 18, serifBold);
  centerText(title.toUpperCase(), height - 192, title.length > 42 ? 23 : 28, serifBold, black);
  centerText(isMembership ? "This is to certify that" : "Presented to", height - 228, 13, serif, muted);
  centerText(fitText(input.memberName.toUpperCase(), 58), height - 272, 29, serifBold, black);
  centerText(`Membership No. ${input.membershipNo}`, height - 300, 11.5, sans, muted);

  if (isMembership) {
    centerText("is recorded as an active member of", height - 334, 13, serif, muted);
    centerText(fitText(input.chapterName, 70), height - 366, 19, serifBold, black);
    centerText("Psi Sigma Phi Philippines Inc.", height - 392, 12.5, serif, muted);
  } else {
    const citation = input.citationText?.trim() || `In recognition of meaningful service, participation and contribution to ${input.chapterName} and Psi Sigma Phi Philippines Inc.`;
    const lines = wrapText(citation, serif, 12.5, width - 190, 4);
    lines.forEach((line, index) => centerText(line, height - 334 - index * 20, 12.5, serif, muted));
    const chapterY = height - 334 - lines.length * 20 - 8;
    centerText(fitText(input.chapterName, 70), chapterY, 14, serifBold, black);
  }

  const certificateDate = input.certificateDate ?? input.issuedAt;
  const displayDate = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(certificateDate);
  const issuedDate = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(input.issuedAt);

  page.drawText(`Certificate No.: ${input.certificateNumber}`, { x: 56, y: 78, size: 9.5, font: sans, color: muted });
  page.drawText(`Certificate Date: ${displayDate}`, { x: 56, y: 61, size: 9.5, font: sans, color: muted });
  page.drawText(`Issued: ${issuedDate}`, { x: 56, y: 44, size: 8.5, font: sans, color: muted });
  if (input.referenceLabel) {
    page.drawText(`Reference: ${fitText(input.referenceLabel, 45)}`, { x: 56, y: 30, size: 8, font: sans, color: muted });
  }

  const signatoryName = fitText(input.signatoryName, 44);
  const signatoryTitle = fitText(input.signatoryTitle, 42);
  const signatoryCenter = width / 2;
  page.drawLine({
    start: { x: signatoryCenter - 105, y: 78 },
    end: { x: signatoryCenter + 105, y: 78 },
    thickness: 0.8,
    color: muted,
  });
  const signatoryWidth = serifBold.widthOfTextAtSize(signatoryName, 11);
  page.drawText(signatoryName, {
    x: signatoryCenter - signatoryWidth / 2,
    y: 61,
    size: 11,
    font: serifBold,
    color: black,
  });
  const titleWidth = sans.widthOfTextAtSize(signatoryTitle, 8.5);
  page.drawText(signatoryTitle, {
    x: signatoryCenter - titleWidth / 2,
    y: 45,
    size: 8.5,
    font: sans,
    color: muted,
  });

  const verificationUrl = certificateVerificationUrl(input.verificationToken);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 240 });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
  const qr = await document.embedPng(qrBytes);
  page.drawImage(qr, { x: width - 134, y: 48, width: 72, height: 72 });
  page.drawText("Scan to verify", { x: width - 125, y: 34, size: 8, font: sans, color: muted });

  return document.save();
}
