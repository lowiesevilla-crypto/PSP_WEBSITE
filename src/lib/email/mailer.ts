import nodemailer from "nodemailer";
import { applicationUrl } from "@/lib/auth/account-tokens";

export class EmailConfigurationError extends Error {
  constructor() {
    super("Email delivery is not configured.");
    this.name = "EmailConfigurationError";
  }
}

export type EmailBrand = {
  chapterName?: string | null;
  chapterLogoUrl?: string | null;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = (process.env.SMTP_USER ?? process.env.SMTP_USERNAME)?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const fromAddress = (process.env.SMTP_FROM ?? process.env.MAIL_FROM_ADDRESS)?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim();
  const replyTo = process.env.MAIL_REPLY_TO?.trim();
  const encryption = process.env.SMTP_ENCRYPTION?.trim().toLowerCase();

  if (!host || !Number.isFinite(port) || !user || !pass || !fromAddress) {
    throw new EmailConfigurationError();
  }

  return {
    host,
    port,
    user,
    pass,
    fromAddress,
    fromName,
    replyTo,
    secure: port === 465 || encryption === "ssl",
  };
}

function resolveEmailLogoUrl(chapterLogoUrl?: string | null) {
  const fallback = applicationUrl("/brand/psp-logo.jpg");
  const candidate = chapterLogoUrl?.trim();
  if (!candidate) return fallback;

  if (candidate.startsWith("/")) {
    return applicationUrl(candidate);
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function renderBrandedEmail(options: {
  subject: string;
  bodyHtml: string;
  brand?: EmailBrand;
  preheader?: string;
}) {
  const chapterName = options.brand?.chapterName?.trim() || "Psi Sigma Phi Philippines Inc.";
  const logoUrl = resolveEmailLogoUrl(options.brand?.chapterLogoUrl);
  const preheader = options.preheader?.trim() || options.subject;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f3f1;color:#151515;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f3f1;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #e4dccb;border-radius:18px;overflow:hidden;box-shadow:0 10px 34px rgba(0,0,0,.08);">
          <tr>
            <td align="center" style="background:#111111;border-top:5px solid #FEC009;padding:28px 24px 24px;">
              <img src="${escapeHtml(logoUrl)}" width="86" height="86" alt="${escapeHtml(chapterName)} logo" style="display:block;width:86px;height:86px;border-radius:50%;object-fit:cover;background:#ffffff;border:3px solid #FEC009;" />
              <div style="margin-top:14px;color:#FEC009;font-size:13px;font-weight:800;letter-spacing:.18em;">Ψ Σ Φ</div>
              <div style="margin-top:7px;color:#ffffff;font-size:21px;line-height:1.3;font-weight:800;">${escapeHtml(chapterName)}</div>
              <div style="margin-top:5px;color:#d9d3c5;font-size:13px;line-height:1.5;">Psi Sigma Phi Philippines Inc.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 26px;font-size:15px;line-height:1.65;color:#302d28;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #eee7da;background:#fbfaf7;padding:20px 30px;text-align:center;color:#777166;font-size:12px;line-height:1.6;">
              Official communication from <strong style="color:#4a453d;">Psi Sigma Phi Philippines Inc.</strong><br />
              For your security, PSP will never ask you to send your password by email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailActionButton(label: string, url: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;"><tr><td style="border-radius:10px;background:#FEC009;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 20px;color:#111111;text-decoration:none;font-weight:800;font-size:15px;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function emailInfoCard(rows: Array<{ label: string; value: string }>) {
  const content = rows
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:7px 12px;color:#746b5b;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#181818;font-size:14px;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;background:#fffaf0;border:1px solid #eadcae;border-radius:12px;">${content}</table>`;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | null;
  brand?: EmailBrand;
  preheader?: string;
}) {
  const config = smtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.fromName
      ? { name: config.fromName, address: config.fromAddress }
      : config.fromAddress,
    replyTo: options.replyTo?.trim() || config.replyTo || undefined,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: renderBrandedEmail({
      subject: options.subject,
      bodyHtml: options.html,
      brand: options.brand,
      preheader: options.preheader,
    }),
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
