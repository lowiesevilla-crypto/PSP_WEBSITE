import { certificateVerificationUrl, generateMembershipCertificatePdf } from "@/lib/certificates/generator";
import { emailActionButton, emailInfoCard, escapeHtml, sendEmail } from "@/lib/email/mailer";

export type CertificateDeliveryInput = {
  certificateId: string;
  certificateNumber: string;
  certificateType: string;
  title: string;
  citationText: string | null;
  certificateDate: Date;
  referenceLabel: string | null;
  issuedAt: Date;
  verificationToken: string;
  memberName: string;
  membershipNo: string;
  memberEmail: string;
  chapterId: string;
  chapterName: string;
  chapterLogoUrl: string | null;
  chapterEmail?: string | null;
  signatoryName: string;
  signatoryTitle: string;
};

function defaultLetter(input: CertificateDeliveryInput) {
  switch (input.certificateType.trim().toUpperCase()) {
    case "APPRECIATION":
      return `In grateful appreciation of your valuable service, dedication, leadership and contribution to ${input.chapterName} and the continuing ideals of Psi Sigma Phi Philippines Inc.`;
    case "ATTENDANCE":
      return `In recognition of your participation and presence in an official activity of ${input.chapterName}. Your continued involvement strengthens our brotherhood and Chapter community.`;
    case "OUTSTANDING_MEMBER":
      return `In recognition of your exemplary conduct, service and commitment as an outstanding member of ${input.chapterName}. Your example reflects the values and traditions of our brotherhood.`;
    case "RECOGNITION":
    case "CUSTOM":
      return `In recognition of your meaningful contribution, commitment and service to ${input.chapterName} and Psi Sigma Phi Philippines Inc.`;
    default:
      return `With fraternal recognition of your membership and continuing commitment to ${input.chapterName} and Psi Sigma Phi Philippines Inc.`;
  }
}

function displayDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(value);
}

export async function sendCertificateIssuedEmail(input: CertificateDeliveryInput) {
  const letter = input.citationText?.trim() || defaultLetter(input);
  const verificationUrl = certificateVerificationUrl(input.verificationToken);
  const pdf = await generateMembershipCertificatePdf({
    memberName: input.memberName,
    membershipNo: input.membershipNo,
    chapterName: input.chapterName,
    chapterLogoUrl: input.chapterLogoUrl,
    certificateNumber: input.certificateNumber,
    issuedAt: input.issuedAt,
    verificationToken: input.verificationToken,
    signatoryName: input.signatoryName,
    signatoryTitle: input.signatoryTitle,
    certificateType: input.certificateType,
    title: input.title,
    citationText: input.citationText,
    certificateDate: input.certificateDate,
    referenceLabel: input.referenceLabel,
  });

  const salutation = input.certificateType.trim().toUpperCase() === "MEMBERSHIP" ? "Dear Brother" : "Dear Brother";
  const subject = `${input.title} · ${input.chapterName}`;
  const text = `${salutation} ${input.memberName},\n\nOn behalf of ${input.chapterName}, it is my privilege to present your ${input.title}.\n\n${letter}\n\nYour official certificate PDF is attached to this email. You may also verify the certificate online at:\n${verificationUrl}\n\nCertificate No.: ${input.certificateNumber}\nCertificate Date: ${displayDate(input.certificateDate)}\n\nFraternally,\n${input.signatoryName}\n${input.signatoryTitle}\n${input.chapterName}\nPsi Sigma Phi Philippines Inc.`;
  const htmlLetter = escapeHtml(letter).replaceAll("\n", "<br />");

  await sendEmail({
    to: input.memberEmail,
    replyTo: input.chapterEmail,
    subject,
    preheader: `${input.title} issued by ${input.chapterName}`,
    brand: {
      chapterId: input.chapterId,
      chapterName: input.chapterName,
      chapterLogoUrl: input.chapterLogoUrl,
    },
    text,
    html: `
      <p style="margin:0 0 16px;">Dear Brother <strong>${escapeHtml(input.memberName)}</strong>,</p>
      <p style="margin:0 0 16px;">On behalf of <strong>${escapeHtml(input.chapterName)}</strong>, it is my privilege to present your <strong>${escapeHtml(input.title)}</strong>.</p>
      <div style="margin:20px 0;padding:18px 20px;border-left:4px solid #FEC009;background:#fffaf0;border-radius:8px;line-height:1.7;">${htmlLetter}</div>
      <p style="margin:0 0 16px;">Your official certificate PDF is attached to this email. The QR code on the certificate and the button below verify the current certificate status directly against the PSP digital platform.</p>
      ${emailInfoCard([
        { label: "Certificate", value: input.title },
        { label: "Certificate No.", value: input.certificateNumber },
        { label: "Certificate Date", value: displayDate(input.certificateDate) },
        { label: "Issuing Chapter", value: input.chapterName },
        { label: "Signatory", value: `${input.signatoryName} · ${input.signatoryTitle}` },
      ])}
      ${emailActionButton("Verify Certificate", verificationUrl)}
      <p style="margin:22px 0 0;">Fraternally,<br /><strong>${escapeHtml(input.signatoryName)}</strong><br />${escapeHtml(input.signatoryTitle)}<br />${escapeHtml(input.chapterName)}</p>
    `,
    attachments: [
      {
        filename: `${input.certificateNumber}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });
}
