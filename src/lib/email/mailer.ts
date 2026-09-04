import nodemailer from "nodemailer";

export class EmailConfigurationError extends Error {
  constructor() {
    super("Email delivery is not configured.");
    this.name = "EmailConfigurationError";
  }
}

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

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
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
    replyTo: config.replyTo || undefined,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
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
