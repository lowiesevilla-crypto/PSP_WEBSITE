import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateReceiptPdf(input: {
  receiptNumber: string;
  issuedAt: Date;
  paidAt: Date | null;
  memberName: string;
  membershipNo: string;
  chapterName: string;
  assessmentTitle: string;
  paymentCategory: string;
  paymentMethod: string | null;
  chapterAmount: string;
  platformFee: string;
  totalAmount: string;
  internalReference: string;
  gatewayReference: string | null;
}) {
  const document = await PDFDocument.create();
  const page = document.addPage([595.28, 841.89]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.06, 0.06, 0.06);
  const gold = rgb(0.996, 0.753, 0.035);
  const muted = rgb(0.35, 0.35, 0.35);

  page.drawRectangle({ x: 32, y: 32, width: 531, height: 777, borderWidth: 2.5, borderColor: black });
  page.drawRectangle({ x: 39, y: 39, width: 517, height: 763, borderWidth: 1, borderColor: gold });

  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "brand", "psp-logo.jpg"));
    const logo = await document.embedJpg(logoBytes);
    page.drawImage(logo, { x: 54, y: 722, width: 70, height: 70 });
  } catch {
    // Keep receipt generation available if the decorative logo asset is unavailable.
  }

  page.drawText("PSI SIGMA PHI PHILIPPINES INC.", { x: 145, y: 768, size: 16, font: bold, color: black });
  page.drawText("OFFICIAL DIGITAL PAYMENT RECEIPT", { x: 145, y: 744, size: 13, font: bold, color: muted });

  page.drawText(`Receipt No. ${input.receiptNumber}`, { x: 54, y: 690, size: 13, font: bold });
  page.drawText(`Issued: ${formatDate(input.issuedAt)}`, { x: 54, y: 670, size: 10, font, color: muted });

  let y = 622;
  const row = (label: string, value: string) => {
    page.drawText(label, { x: 54, y, size: 10, font: bold, color: muted });
    page.drawText(value.slice(0, 80), { x: 190, y, size: 11, font, color: black });
    y -= 27;
  };

  row("Member", input.memberName);
  row("Membership No.", input.membershipNo);
  row("Chapter", input.chapterName);
  row("Payment Type", input.paymentCategory.replaceAll("_", " "));
  row("Purpose", input.assessmentTitle);
  row("Payment Method", input.paymentMethod?.toUpperCase() ?? "PayMongo");
  row("Payment Date", input.paidAt ? formatDate(input.paidAt) : "Confirmed");
  row("Internal Reference", input.internalReference);
  row("PayMongo Intent", input.gatewayReference ?? "Not available");

  page.drawRectangle({ x: 54, y: y - 88, width: 487, height: 116, color: rgb(0.98, 0.96, 0.88) });
  page.drawText("CHAPTER AMOUNT", { x: 72, y: y + 2, size: 9, font: bold, color: muted });
  page.drawText(`PHP ${input.chapterAmount}`, { x: 390, y: y + 2, size: 11, font: bold, color: black });
  page.drawText("PLATFORM CONVENIENCE FEE", { x: 72, y: y - 24, size: 9, font: bold, color: muted });
  page.drawText(`PHP ${input.platformFee}`, { x: 390, y: y - 24, size: 11, font: bold, color: black });
  page.drawText("TOTAL PAID", { x: 72, y: y - 60, size: 11, font: bold, color: black });
  page.drawText(`PHP ${input.totalAmount}`, { x: 360, y: y - 64, size: 18, font: bold, color: black });

  page.drawText("The chapter amount is posted to the member ledger; the separately disclosed platform fee is not chapter income.", { x: 54, y: 92, size: 8.5, font, color: muted });
  page.drawText("Payment history and split-settlement evidence are retained for reconciliation and audit.", { x: 54, y: 76, size: 8.5, font, color: muted });

  return document.save();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(value);
}
