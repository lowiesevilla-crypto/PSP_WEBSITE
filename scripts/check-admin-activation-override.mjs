import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [
  registrationPage,
  registrationWizard,
  applicationReview,
  activationRoute,
  invitationHelper,
  overrideRoute,
  memberActions,
  memberPage,
  loginRoute,
  loginForm,
  temporarySession,
  changeRoute,
  changePage,
  passkeyRoute,
] = await Promise.all([
  source("src/app/register/page.tsx"),
  source("src/components/registration/registration-wizard.tsx"),
  source("src/app/api/admin/applications/[id]/review/route.ts"),
  source("src/app/api/auth/activate/route.ts"),
  source("src/lib/member/invitation.ts"),
  source("src/app/api/admin/members/[id]/activation-override/route.ts"),
  source("src/components/admin/member-admin-actions.tsx"),
  source("src/app/admin/members/page.tsx"),
  source("src/app/api/auth/login/route.ts"),
  source("src/components/auth/login-form.tsx"),
  source("src/lib/auth/temporary-password.ts"),
  source("src/app/api/auth/change-temporary-password/route.ts"),
  source("src/app/change-password/page.tsx"),
  source("src/app/api/auth/passkeys/authenticate/verify/route.ts"),
]);

// Existing online registration and signed email activation remain the primary workflow.
assert(registrationPage.includes("RegistrationWizard") && registrationPage.includes("Online Membership Registration"), "Online registration page must remain available.");
assert(registrationWizard.includes('fetch("/api/registration"') && registrationWizard.includes("Application Submitted"), "Online membership application submission must remain available.");
assert(applicationReview.includes("sendMemberInvitationEmail") && applicationReview.includes('status: "INVITED"'), "Application approval must retain the existing email activation workflow.");
assert(activationRoute.includes("verifyActivationToken") && activationRoute.includes('status: "ACTIVE"'), "Signed email activation must remain valid.");
assert(invitationHelper.includes("createActivationToken") && invitationHelper.includes("sendMemberInvitationEmail"), "Activation invitation delivery contract is missing.");

// Admin override is exact-Chapter scoped and never bypasses approved membership.
assert(overrideRoute.includes('requirePermission("members.manage", member.chapterId)'), "Activation override must enforce server-side exact-Chapter members.manage permission.");
assert(overrideRoute.includes('member.membershipStatus !== "ACTIVE"'), "Activation override must be limited to approved active memberships.");
assert(overrideRoute.includes("member.user.id === context.user.id"), "Administrator self credential override must remain blocked.");
assert(overrideRoute.includes("targetHasAdminAuthority") && overrideRoute.includes("actorHasNationalMemberAuthority"), "Chapter Admin must not be able to take over another administrator account.");
assert(overrideRoute.includes("MEMBER_ADMIN_TEMPORARY_PASSWORD_SET") && overrideRoute.includes("MEMBER_ADMIN_ACTIVATION_RESET"), "Activation override actions must be audited.");
assert(!overrideRoute.includes("sendEmail(") && !overrideRoute.includes("sendMemberInvitationEmail("), "Admin temporary passwords must never be emailed by the system.");
assert(overrideRoute.includes("hashPassword(parsed.data.temporaryPassword)"), "Temporary passwords must be stored only as password hashes.");
assert(overrideRoute.includes("passwordHash: null") && overrideRoute.includes("emailVerifiedAt: null"), "Activation reset must invalidate the current password and email activation state.");

// UI exposes the support control only within the existing scoped member-management surface.
assert(memberPage.includes("canOverrideActivation") && memberActions.includes("Admin Activate / Set Temporary Password"), "Member Administration must expose the activation override control.");
assert(memberActions.includes("Resend Invitation"), "Existing resend-invitation control must remain available.");
assert(memberActions.includes("Reset Activation"), "Activation reset control is missing.");
assert(memberActions.includes("Activate with Temporary Password"), "Temporary-password activation control is missing.");

// Temporary credentials receive a restricted cookie, not a normal authenticated PSP session.
assert(loginRoute.includes('user.status === "INVITED"') && loginRoute.includes("passwordChangeRequired: true"), "Temporary-password login must be recognized explicitly.");
assert(loginRoute.includes("TEMPORARY_PASSWORD_COOKIE_NAME") && loginRoute.includes('response.cookies.set(SESSION_COOKIE_NAME, ""'), "Temporary-password login must issue only the restricted password-change session.");
assert(loginForm.includes('router.replace("/change-password")'), "Temporary-password login must route directly to forced permanent-password creation.");
assert(temporarySession.includes('purpose: "temporary-password-change"') && temporarySession.includes('user.status !== "INVITED"'), "Restricted password-change session must be signed, fingerprint-bound, and fail closed outside INVITED state.");
assert(passkeyRoute.includes('passkey.user.status !== "ACTIVE"'), "Passkeys must not bypass the temporary-password forced-change state.");

// Completing forced change activates the account and invalidates the temporary credential.
assert(changeRoute.includes("verifyPassword(parsed.data.password, user.passwordHash)"), "Permanent password must be required to differ from the temporary password.");
assert(changeRoute.includes('status: "ACTIVE"') && changeRoute.includes("AUTH_TEMPORARY_PASSWORD_REPLACED"), "Permanent-password completion must activate and audit the account.");
assert(changeRoute.includes("createSessionToken") && changeRoute.includes("TEMPORARY_PASSWORD_COOKIE_NAME"), "Permanent-password completion must issue the normal session and clear the restricted session.");
assert(changePage.includes("Create Your Permanent Password"), "Forced permanent-password page is missing.");

console.log("Admin activation override security contract passed while preserving online registration and email activation.");
