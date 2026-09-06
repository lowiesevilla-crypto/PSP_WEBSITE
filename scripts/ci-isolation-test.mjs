import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL = "ci-alpha-admin@example.invalid";
const PASSWORD = "CI-Chapter-Admin-Password-2026!";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const payload = await response.json().catch(() => ({}));
  assert(response.status === 200, `Chapter Admin login failed: ${response.status} ${JSON.stringify(payload)}`);
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "Login did not return a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function request(path, cookie, init = {}) {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Cookie: cookie,
      Origin: BASE_URL,
      "Sec-Fetch-Site": "same-origin",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function main() {
  const cookie = await login();

  const ownList = await request("/api/admin/applications?chapterId=ci-chapter-alpha&pageSize=50", cookie);
  assert(ownList.status === 200, `Expected own-chapter application list 200, received ${ownList.status}.`);
  const ownPayload = await ownList.json();
  const ownIds = new Set((ownPayload.applications ?? []).map((item) => item.id));
  assert(ownIds.has("ci-alpha-application"), "Own-chapter application was not visible.");
  assert(!ownIds.has("ci-beta-application"), "Cross-chapter application leaked into own-chapter results.");

  const foreignList = await request("/api/admin/applications?chapterId=ci-chapter-beta&pageSize=50", cookie);
  assert(foreignList.status === 403, `Expected cross-chapter application list 403, received ${foreignList.status}.`);

  const foreignReview = await request("/api/admin/applications/ci-beta-application/review", cookie, {
    method: "POST",
    body: JSON.stringify({ status: "UNDER_REVIEW", reviewNotes: "CI unauthorized review attempt" }),
  });
  assert(foreignReview.status === 403, `Expected cross-chapter application review 403, received ${foreignReview.status}.`);

  const betaApplication = await prisma.membershipApplication.findUnique({ where: { id: "ci-beta-application" }, select: { status: true, reviewNotes: true } });
  assert(betaApplication?.status === "SUBMITTED", `Unauthorized review changed foreign application status to ${betaApplication?.status}.`);
  assert(!betaApplication?.reviewNotes, "Unauthorized review wrote foreign application notes.");

  const ownApproval = await request("/api/admin/applications/ci-alpha-application/review", cookie, {
    method: "POST",
    body: JSON.stringify({ status: "APPROVED", reviewNotes: "CI approved application email contract" }),
  });
  const ownApprovalPayload = await ownApproval.json().catch(() => ({}));
  assert(ownApproval.status === 200, `Expected own-chapter approval 200, received ${ownApproval.status}: ${JSON.stringify(ownApprovalPayload)}.`);
  assert(ownApprovalPayload.member?.membershipNo, "Approved application did not return a membership number.");
  assert(ownApprovalPayload.activationRequired === true, "Newly approved CI member should require activation.");
  assert(
    ownApprovalPayload.welcomeDelivery === "failed",
    `Expected unconfigured CI SMTP to report welcomeDelivery=failed without rolling back approval, received ${JSON.stringify(ownApprovalPayload)}.`,
  );

  const approvedApplication = await prisma.membershipApplication.findUnique({ where: { id: "ci-alpha-application" }, select: { status: true } });
  assert(approvedApplication?.status === "APPROVED", "Welcome email failure rolled back approved membership application state.");

  const welcomeFailure = await prisma.auditLog.findFirst({
    where: {
      action: "MEMBER_WELCOME_EMAIL_FAILED",
      entityType: "Member",
      entityId: ownApprovalPayload.member?.id,
      actorUserId: "ci-alpha-admin-user",
    },
  });
  assert(welcomeFailure, "Approved-member welcome email failure did not create audit evidence.");

  const foreignMedia = await request("/api/community/media/ci-beta-image", cookie);
  assert(foreignMedia.status === 403, `Expected cross-chapter protected media 403, received ${foreignMedia.status}.`);

  const foreignFinance = await request("/api/admin/finance/rates", cookie, {
    method: "POST",
    body: JSON.stringify({ chapterId: "ci-chapter-beta", assessmentTypeCode: "MONTHLY_DUES", amount: 500, effectiveFrom: "2026-09-01T00:00:00.000Z" }),
  });
  assert(foreignFinance.status === 403, `Expected cross-chapter finance mutation 403, received ${foreignFinance.status}.`);

  const foreignAnnouncement = await request("/api/announcements", cookie, {
    method: "POST",
    body: JSON.stringify({
      audience: "CHAPTER",
      chapterId: "ci-chapter-beta",
      title: "Unauthorized Beta announcement",
      body: "This must be rejected by chapter scoping.",
      isPinned: false,
      isPublic: true,
    }),
  });
  assert(foreignAnnouncement.status === 403, `Expected cross-chapter announcement mutation 403, received ${foreignAnnouncement.status}.`);

  const ownPublicAnnouncement = await request("/api/announcements", cookie, {
    method: "POST",
    body: JSON.stringify({
      audience: "CHAPTER",
      chapterId: "ci-chapter-alpha",
      title: "CI Runtime Public Announcement",
      body: "Authorized Chapter Admin public announcement persistence test.",
      isPinned: false,
      isPublic: true,
    }),
  });
  const ownPublicAnnouncementPayload = await ownPublicAnnouncement.json().catch(() => ({}));
  assert(ownPublicAnnouncement.status === 201, `Expected own public announcement 201, received ${ownPublicAnnouncement.status}: ${JSON.stringify(ownPublicAnnouncementPayload)}.`);
  assert(ownPublicAnnouncementPayload.announcement?.isPublic === true, "Authorized public announcement did not persist isPublic=true.");

  const foreignEdit = await request("/api/admin/members/ci-beta-member", cookie, {
    method: "PATCH",
    body: JSON.stringify({ mobile: "09999999991" }),
  });
  assert(foreignEdit.status === 403, `Expected cross-chapter member edit 403, received ${foreignEdit.status}.`);

  const ownEdit = await request("/api/admin/members/ci-alpha-member", cookie, {
    method: "PATCH",
    body: JSON.stringify({ mobile: "09999999992", address: "CI Alpha Updated Address" }),
  });
  const ownEditPayload = await ownEdit.json().catch(() => ({}));
  assert(ownEdit.status === 200, `Expected own-chapter member edit 200, received ${ownEdit.status}: ${JSON.stringify(ownEditPayload)}.`);
  const [editedAlphaMember, unchangedBetaMember, editAudit] = await Promise.all([
    prisma.member.findUnique({ where: { id: "ci-alpha-member" }, select: { mobile: true, address: true } }),
    prisma.member.findUnique({ where: { id: "ci-beta-member" }, select: { mobile: true } }),
    prisma.auditLog.findFirst({
      where: { action: "MEMBER_PROFILE_UPDATED_ADMIN", entityType: "Member", entityId: "ci-alpha-member", actorUserId: "ci-alpha-admin-user" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  assert(editedAlphaMember?.mobile === "09999999992" && editedAlphaMember.address === "CI Alpha Updated Address", "Authorized member edit did not persist expected fields.");
  assert(unchangedBetaMember?.mobile !== "09999999991", "Unauthorized member edit changed the foreign Chapter member.");
  assert(editAudit, "Authorized member edit did not create audit evidence.");

  const foreignPaymentConfig = await request("/api/admin/finance/payment-config", cookie, {
    method: "PUT",
    body: JSON.stringify({
      chapterId: "ci-chapter-beta",
      mode: "TEST",
      linkedAccountId: "org_CIBetaUnauthorized01",
      paymentMethods: ["qrph"],
      isEnabled: false,
    }),
  });
  assert(foreignPaymentConfig.status === 403, `Expected cross-chapter PayMongo config 403, received ${foreignPaymentConfig.status}.`);

  const ownPaymentDraft = await request("/api/admin/finance/payment-config", cookie, {
    method: "PUT",
    body: JSON.stringify({
      chapterId: "ci-chapter-alpha",
      mode: "TEST",
      linkedAccountId: "org_CIAlphaLinked01",
      paymentMethods: ["qrph", "gcash"],
      isEnabled: false,
    }),
  });
  const ownPaymentDraftPayload = await ownPaymentDraft.json().catch(() => ({}));
  assert(ownPaymentDraft.status === 200, `Expected own PayMongo draft save 200, received ${ownPaymentDraft.status}: ${JSON.stringify(ownPaymentDraftPayload)}.`);
  assert(ownPaymentDraftPayload.config?.isEnabled === false, "PayMongo draft unexpectedly enabled online payment.");
  assert(ownPaymentDraftPayload.configurationState === "DRAFT", `Expected PayMongo DRAFT state, received ${ownPaymentDraftPayload.configurationState}.`);
  assert(ownPaymentDraftPayload.platformReady === false, "CI unexpectedly reported PayMongo parent platform ready.");

  const ownPaymentRead = await request("/api/admin/finance/payment-config?chapterId=ci-chapter-alpha", cookie);
  const ownPaymentReadPayload = await ownPaymentRead.json().catch(() => ({}));
  assert(ownPaymentRead.status === 200, `Expected PayMongo config read 200, received ${ownPaymentRead.status}.`);
  assert(ownPaymentReadPayload.config?.linkedAccountId === "org_CIAlphaLinked01", "Saved linked PayMongo child Account ID was not returned.");
  assert(ownPaymentReadPayload.config?.hasWebhookSecret === false, "Draft PayMongo config must not pretend a real child webhook secret exists.");
  assert(ownPaymentReadPayload.configurationState === "DRAFT", "Saved PayMongo draft did not remain in DRAFT state.");

  const blockedEnable = await request("/api/admin/finance/payment-config", cookie, {
    method: "PUT",
    body: JSON.stringify({
      chapterId: "ci-chapter-alpha",
      mode: "TEST",
      linkedAccountId: "org_CIAlphaLinked01",
      paymentMethods: ["qrph", "gcash"],
      isEnabled: true,
    }),
  });
  assert(blockedEnable.status === 409, `Expected PayMongo activation without parent platform config to fail 409, received ${blockedEnable.status}.`);
  const persistedPaymentConfig = await prisma.chapterPaymentConfig.findUnique({ where: { chapterId: "ci-chapter-alpha" }, select: { isEnabled: true } });
  assert(persistedPaymentConfig?.isEnabled === false, "Failed PayMongo activation changed the persisted Chapter to enabled.");

  const foreignCertificate = await request("/api/admin/certificates", cookie, {
    method: "POST",
    body: JSON.stringify({
      memberIds: ["ci-beta-member"],
      certificateType: "APPRECIATION",
      title: "Certificate of Appreciation",
      citationText: "Cross-Chapter issuance must be denied.",
      certificateDate: "2026-09-06",
      batchId: "ci-cross-chapter-batch",
    }),
  });
  assert(foreignCertificate.status === 403, `Expected cross-chapter certificate issuance 403, received ${foreignCertificate.status}.`);

  const ownCertificate = await request("/api/admin/certificates", cookie, {
    method: "POST",
    body: JSON.stringify({
      memberIds: ["ci-alpha-member"],
      certificateType: "APPRECIATION",
      title: "Certificate of Appreciation",
      citationText: "For outstanding participation in the CI platform hardening acceptance suite.",
      certificateDate: "2026-09-06",
      referenceLabel: "CI Platform Hardening",
      batchId: "ci-platform-hardening-batch",
    }),
  });
  const ownCertificatePayload = await ownCertificate.json().catch(() => ({}));
  assert(ownCertificate.status === 201, `Expected own certificate issuance 201, received ${ownCertificate.status}: ${JSON.stringify(ownCertificatePayload)}.`);
  assert(ownCertificatePayload.createdCount === 1, `Expected one custom certificate, received ${JSON.stringify(ownCertificatePayload)}.`);
  const issuedCertificate = await prisma.certificate.findFirst({
    where: { batchId: "ci-platform-hardening-batch", memberId: "ci-alpha-member" },
    select: { id: true, certificateType: true, title: true, verificationToken: true, status: true },
  });
  assert(issuedCertificate?.certificateType === "APPRECIATION" && issuedCertificate.title === "Certificate of Appreciation", "Custom certificate metadata was not persisted.");
  assert(issuedCertificate.status === "VALID", "New custom certificate is not valid.");

  const certificatePdf = await request(`/api/member/certificates/${issuedCertificate.id}/pdf`, cookie);
  assert(certificatePdf.status === 200, `Expected authorized custom certificate PDF 200, received ${certificatePdf.status}.`);
  assert((certificatePdf.headers.get("content-type") ?? "").includes("application/pdf"), "Custom certificate download did not return a PDF.");

  const publicVerification = await fetch(`${BASE_URL}/verify/${encodeURIComponent(issuedCertificate.verificationToken)}`);
  const publicVerificationHtml = await publicVerification.text();
  assert(publicVerification.status === 200, `Expected public certificate verification 200, received ${publicVerification.status}.`);
  assert(publicVerificationHtml.includes("Certificate of Appreciation"), "Public QR verification does not show the actual custom certificate title.");

  const foreignResend = await request("/api/admin/members/ci-beta-member/resend-invitation", cookie, { method: "POST" });
  assert(foreignResend.status === 403, `Expected cross-chapter invitation resend 403, received ${foreignResend.status}.`);

  const ownResend = await request("/api/admin/members/ci-alpha-member/resend-invitation", cookie, { method: "POST" });
  assert(ownResend.status === 502, `Expected authorized invitation resend to reach unconfigured CI mail delivery and return 502, received ${ownResend.status}.`);
  const inviteFailure = await prisma.auditLog.findFirst({
    where: { action: "MEMBER_INVITATION_EMAIL_FAILED", entityType: "Member", entityId: "ci-alpha-member", actorUserId: "ci-alpha-admin-user" },
  });
  assert(inviteFailure, "Authorized invitation resend did not create failure audit evidence.");

  const foreignDelete = await request("/api/admin/members/ci-beta-member", cookie, { method: "DELETE" });
  assert(foreignDelete.status === 403, `Expected cross-chapter member delete 403, received ${foreignDelete.status}.`);

  const ownDelete = await request("/api/admin/members/ci-alpha-member", cookie, { method: "DELETE" });
  assert(ownDelete.status === 200, `Expected own-chapter member delete 200, received ${ownDelete.status}.`);

  const [archivedMember, disabledUser, revokedDigitalId, activeRoles] = await Promise.all([
    prisma.member.findUnique({ where: { id: "ci-alpha-member" }, select: { membershipStatus: true } }),
    prisma.user.findUnique({ where: { id: "ci-alpha-member-user" }, select: { status: true } }),
    prisma.digitalMemberId.findUnique({ where: { memberId: "ci-alpha-member" }, select: { status: true, revokedAt: true } }),
    prisma.userRoleAssignment.count({
      where: { userId: "ci-alpha-member-user", startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    }),
  ]);
  assert(archivedMember?.membershipStatus === "ARCHIVED", "Authorized delete did not archive the member.");
  assert(disabledUser?.status === "DISABLED", "Authorized delete did not disable member-only account access.");
  assert(revokedDigitalId?.status === "REVOKED" && revokedDigitalId.revokedAt, "Authorized delete did not revoke the Digital Member ID.");
  assert(activeRoles === 0, "Authorized delete left active member role assignments.");

  const betaMember = await prisma.member.findUnique({ where: { id: "ci-beta-member" }, select: { membershipStatus: true } });
  assert(betaMember?.membershipStatus === "ACTIVE", "Unauthorized cross-chapter delete changed the foreign member.");

  console.log("Cross-chapter isolation, hardening payment/member/certificate/public-content, member administration, and approval email suite passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
