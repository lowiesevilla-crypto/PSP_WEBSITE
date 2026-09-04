import { applicationUrl, createActivationToken } from "@/lib/auth/account-tokens";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { chapterLogoPublicPath } from "@/lib/chapter/logo";
import {
  emailActionButton,
  emailInfoCard,
  escapeHtml,
  sendEmail,
} from "@/lib/email/mailer";

export type MemberInvitationUser = {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
};

export type MemberInvitationMember = {
  membershipNo: string;
};

export type MemberInvitationChapter = {
  id: string;
  name: string;
  email: string | null;
  logoUrl?: string | null;
};

export function memberNeedsActivation(user: MemberInvitationUser) {
  return user.status !== "ACTIVE" || !user.emailVerifiedAt || !user.passwordHash;
}

export async function sendMemberInvitationEmail(options: {
  user: MemberInvitationUser;
  member: MemberInvitationMember;
  chapter: MemberInvitationChapter;
  mode?: "welcome" | "resend";
}) {
  const { user, member, chapter, mode = "welcome" } = options;

  if (user.status === "SUSPENDED" || user.status === "DISABLED") {
    throw new Error("Suspended or disabled accounts cannot receive an activation invitation.");
  }

  const activationRequired = memberNeedsActivation(user);
  const activationUrl = activationRequired
    ? applicationUrl(
        `/activate?token=${encodeURIComponent(
          createActivationToken({ id: user.id, email: user.email }),
        )}`,
      )
    : null;
  const loginUrl = applicationUrl("/login");
  const installUrl = applicationUrl("/install");
  const chairman = await getCurrentChapterChairman(chapter.id);
  const chairmanName = chairman?.name ?? "Chapter Chairman";
  const chairmanTitle = chairman?.title ?? "Chapter Chairman";

  const resendIntro =
    mode === "resend"
      ? "An authorized PSP administrator requested a new activation invitation for your approved member account."
      : `Welcome to ${chapter.name}. Your membership application has been approved.`;
  const subject =
    mode === "resend"
      ? `Your PSP account activation link — ${chapter.name}`
      : `Welcome to ${chapter.name} — your PSP membership is approved`;

  const accountDetailsHtml = emailInfoCard([
    { label: "Membership No.", value: member.membershipNo },
    { label: "Login Email", value: user.email },
    { label: "Chapter", value: chapter.name },
  ]);

  const accountActionHtml = activationUrl
    ? `${emailActionButton("Activate PSP Member Account", activationUrl)}<p style="margin:0 0 18px;color:#6c665c;font-size:13px;">Create your own password using this secure link. The activation link expires in 24 hours.</p>`
    : `${emailActionButton("Sign in to PSP Member Portal", loginUrl)}<p style="margin:0 0 18px;color:#6c665c;font-size:13px;">Your account is already active. Use your registered email address and existing password to sign in.</p>`;

  const installActionHtml = `${emailActionButton("Install PSP Mobile App", installUrl)}<p style="margin:0 0 18px;color:#6c665c;font-size:13px;">On supported Android browsers, the PSP install page opens the phone's native PWA installation prompt. On iPhone/iPad, Safari will guide you to Add to Home Screen.</p>`;

  const actionText = activationUrl
    ? `Activate your account and create your password: ${activationUrl}\nThis secure activation link expires in 24 hours.`
    : `Sign in to your member account: ${loginUrl}`;

  await sendEmail({
    to: user.email,
    replyTo: chapter.email,
    subject,
    preheader: `${chapter.name} membership approved — activate your PSP account and install the mobile app.`,
    brand: {
      chapterName: chapter.name,
      chapterLogoUrl: chapterLogoPublicPath(chapter.id, chapter.logoUrl),
    },
    text: `Hello ${user.displayName},\n\n${resendIntro}\n\nMembership No.: ${member.membershipNo}\nLogin email: ${user.email}\nChapter: ${chapter.name}\n\n${actionText}\n\nInstall the PSP mobile app: ${installUrl}\n\nPSP does not send a temporary or plaintext password. You create your own password through the secure activation link.\n\nFraternally yours,\n${chairmanName}\n${chairmanTitle}\n${chapter.name}`,
    html: `<p style="margin-top:0;">Hello <strong>${escapeHtml(user.displayName)}</strong>,</p><p>${escapeHtml(resendIntro)}</p>${accountDetailsHtml}${accountActionHtml}<h2 style="margin:26px 0 8px;color:#171717;font-size:18px;">Get the PSP Mobile App</h2><p style="margin:0 0 12px;">Install PSP on your phone for faster access to your Digital ID, chapter updates, payments, receipts, certificates and passkey sign-in.</p>${installActionHtml}<p style="margin:24px 0 0;">Fraternally yours,<br/><strong>${escapeHtml(chairmanName)}</strong><br/>${escapeHtml(chairmanTitle)}<br/>${escapeHtml(chapter.name)}</p>`,
  });

  return { activationRequired };
}
