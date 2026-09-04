import { applicationUrl, createActivationToken } from "@/lib/auth/account-tokens";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { escapeHtml, sendEmail } from "@/lib/email/mailer";

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

  const actionText = activationUrl
    ? `Activate your account and create your password: ${activationUrl}\nThis secure activation link expires in 24 hours.`
    : `Sign in to your member account: ${loginUrl}`;
  const actionHtml = activationUrl
    ? `<p><a href="${escapeHtml(activationUrl)}">Activate your PSP Member Account</a></p><p>This secure activation link expires in 24 hours.</p>`
    : `<p><a href="${escapeHtml(loginUrl)}">Sign in to PSP Member Portal</a></p>`;

  const resendIntro =
    mode === "resend"
      ? "An authorized PSP administrator requested a new activation invitation for your approved member account."
      : `Welcome to ${chapter.name}. Your membership application has been approved.`;
  const subject =
    mode === "resend"
      ? `Your PSP account activation link — ${chapter.name}`
      : `Welcome to ${chapter.name} — your PSP membership is approved`;

  await sendEmail({
    to: user.email,
    replyTo: chapter.email,
    subject,
    text: `Hello ${user.displayName},\n\n${resendIntro}\n\nMembership No.: ${member.membershipNo}\nLogin email: ${user.email}\n${actionText}\n\nInstall the PSP mobile app (PWA): ${installUrl}\n\nFor your security, PSP never sends a plaintext password by email.\n\nFrom,\n${chairmanName}\n${chairmanTitle}\n${chapter.name}`,
    html: `<p>Hello ${escapeHtml(user.displayName)},</p><p>${escapeHtml(resendIntro)}</p><p>Membership No.: <strong>${escapeHtml(member.membershipNo)}</strong><br/>Login email: <strong>${escapeHtml(user.email)}</strong></p>${actionHtml}<p><a href="${escapeHtml(installUrl)}">Install the PSP Mobile App (PWA)</a></p><p>For your security, PSP never sends a plaintext password by email.</p><p>Fraternally yours,<br/><strong>${escapeHtml(chairmanName)}</strong><br/>${escapeHtml(chairmanTitle)}<br/>${escapeHtml(chapter.name)}</p>`,
  });

  return { activationRequired };
}
