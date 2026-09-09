import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [
  schema,
  paymentRoute,
  paymentRuntime,
  paymentAdminUi,
  publicPage,
  announcementRoute,
  announcementManager,
  productionBuildInit,
  readinessRoute,
  memberRoute,
  certificateRoute,
  certificatePage,
  verificationPage,
  adminCss,
  certificateGenerator,
  certificateDelivery,
  certificatePdfRoute,
  certificateManager,
  liveApproval,
  liveApprovalApi,
  liveApprovalUi,
  paymongoClient,
  platformConfig,
  adminLayout,
  memberPaymentsPage,
  splitPaymentAction,
  payButton,
  otherPaymentForm,
  financeManager,
  assessmentRoute,
  eventManager,
  healthRoute,
] = await Promise.all([
  source("prisma/schema.prisma"),
  source("src/app/api/admin/finance/payment-config/route.ts"),
  source("src/lib/paymongo/chapter-config.ts"),
  source("src/components/admin/chapter-payment-config.tsx"),
  source("src/app/page.tsx"),
  source("src/app/api/announcements/route.ts"),
  source("src/components/admin/announcement-manager.tsx"),
  source("scripts/production-build-init.mjs"),
  source("src/app/api/health/ready/route.ts"),
  source("src/app/api/admin/members/[id]/route.ts"),
  source("src/app/api/admin/certificates/route.ts"),
  source("src/app/certificate/page.tsx"),
  source("src/app/verify/[token]/page.tsx"),
  source("src/app/admin/admin-responsive.css"),
  source("src/lib/certificates/generator.ts"),
  source("src/lib/certificates/delivery.ts"),
  source("src/app/api/member/certificates/[id]/pdf/route.ts"),
  source("src/components/admin/certificate-manager.tsx"),
  source("src/lib/paymongo/live-approval.ts"),
  source("src/app/api/admin/finance/paymongo-live-approval/route.ts"),
  source("src/components/admin/paymongo-live-approval-control.tsx"),
  source("src/lib/paymongo/client.ts"),
  source("src/lib/paymongo/platform-config.ts"),
  source("src/app/admin/layout.tsx"),
  source("src/app/payments/page.tsx"),
  source("src/components/payments/split-payment-action.tsx"),
  source("src/components/payments/pay-button.tsx"),
  source("src/components/payments/other-payment-form.tsx"),
  source("src/components/admin/finance-manager.tsx"),
  source("src/app/api/admin/finance/assessments/route.ts"),
  source("src/components/admin/event-manager.tsx"),
  source("src/app/api/health/route.ts"),
]);

assert(schema.includes('certificateType   String            @default("MEMBERSHIP")'), "Certificate type metadata is missing from Prisma schema.");
assert(schema.includes('title             String            @default("Certificate of Membership")'), "Certificate title metadata is missing from Prisma schema.");
assert(schema.includes("@@unique([batchId, memberId])"), "Certificate batch/recipient idempotency constraint is missing.");
assert(schema.includes("isPublic  Boolean       @default(false)"), "Public announcement visibility must default fail-closed in Prisma schema.");

assert(paymentRoute.includes("PENDING_LINKED_WEBHOOK_SECRET"), "Payment draft marker contract is missing.");
assert(paymentRoute.includes("if (input.isEnabled)"), "Payment activation is not separated from draft save.");
assert(paymentRoute.includes("createLinkedWebhook"), "Payment activation no longer provisions the linked child webhook.");
assert(paymentRoute.includes("secretKeyCiphertext: input.linkedAccountId"), "Disabled Chapter drafts must store the non-secret linked org_* identifier without requiring credential encryption.");
assert(paymentRoute.includes("webhookSecretCiphertext = PENDING_LINKED_WEBHOOK_SECRET"), "Disabled Chapter drafts must use the non-secret pending webhook marker without requiring credential encryption.");
assert(!paymentRoute.includes("encryptSecret(input.linkedAccountId)"), "PayMongo linked Account IDs are identifiers and must not make draft saving depend on PAYMENT_CONFIG_ENCRYPTION_KEY.");
const encryptionGuardIndex = paymentRoute.indexOf("if (!paymentEncryptionReady())");
const webhookCreationIndex = paymentRoute.indexOf("const createdWebhook = await createLinkedWebhook");
assert(encryptionGuardIndex >= 0 && webhookCreationIndex > encryptionGuardIndex, "Credential-encryption readiness must be checked before creating a PayMongo child webhook.");
assert(paymentRuntime.includes('direct.startsWith("org_")'), "Runtime payment configuration must support direct non-secret linked org_* identifiers.");
assert(paymentRuntime.includes("isPendingLinkedWebhookSecret"), "Runtime payment configuration does not reject staged webhook state.");
assert(paymentAdminUi.includes("PSP PARENT SPLIT-PAYMENT PLATFORM"), "Finance Admin UI must visibly separate PSP parent split-payment setup from Chapter setup.");
assert(paymentAdminUi.includes('<option value="TEST">TEST</option>') && paymentAdminUi.includes('<option value="LIVE">LIVE</option>'), "Disabled Chapter PayMongo mode must be editable as TEST/LIVE in the Admin UI.");
assert(paymentAdminUi.includes("paymentEncryptionReady"), "Finance Admin UI must surface credential-encryption readiness before activation.");
assert(paymentAdminUi.includes("Save Disabled Chapter Draft"), "Finance Admin UI must make the safe draft-save action explicit.");
assert(paymentAdminUi.includes("draftMatchesSaved"), "Finance Admin UI must require the exact current draft to be persisted before activation.");
assert(paymentAdminUi.includes("Valid ID · unsaved changes"), "Finance Admin UI must not label a merely typed org_* identifier as saved.");
assert(paymentAdminUi.includes("Unsaved Chapter payment changes"), "Finance Admin UI must visibly warn when Chapter payment changes have not been persisted.");
assert(paymentAdminUi.includes('data-payment-encryption-setup="national-admin-v1"'), "National Admin must see a dedicated credential-encryption setup panel when activation is blocked.");
assert(paymentAdminUi.includes("Open Hostinger hPanel") && paymentAdminUi.includes("Re-check activation readiness"), "Credential-encryption setup must show where to configure the server key and allow readiness re-check.");
assert(paymentAdminUi.includes('data-payment-activation-ux-version="national-admin-v2"'), "PayMongo activation UX deployment marker is missing.");
assert(paymentAdminUi.includes("requestOnlinePayment") && paymentAdminUi.includes("Clickable for visibility"), "Enable Online Payment must be actionable and explain blockers instead of appearing broken.");
assert(!paymentAdminUi.includes("disabled={busy || (!enabled && !canRequestEnable)}"), "Blocked activation control must remain clickable for blocker visibility.");

assert(liveApproval.includes("PAYMONGO_LIVE_APPROVAL_GRANTED") && liveApproval.includes("PAYMONGO_LIVE_APPROVAL_REVOKED"), "PayMongo LIVE approval must be append-only and auditable.");
assert(liveApproval.includes("PAYMONGO_LIVE_ENABLED") && liveApproval.includes("serverLiveEnabled"), "PayMongo LIVE approval must remain separate from the server LIVE kill-switch.");
assert(liveApproval.includes("chapterId === null") && liveApproval.includes('permissions.includes("finance.manage")'), "Only national-scoped Finance administration may approve PayMongo LIVE processing.");
assert(liveApprovalApi.includes('z.literal("APPROVE")') && liveApprovalApi.includes('z.literal("REVOKE")'), "PayMongo LIVE approval API must support controlled approval and revocation.");
assert(liveApprovalApi.includes("testDuesPaymentVerified") && liveApprovalApi.includes("testContributionPaymentVerified") && liveApprovalApi.includes("webhookAndReceiptVerified"), "LIVE approval must require all controlled TEST acceptance confirmations.");
assert(liveApprovalUi.includes('data-paymongo-live-approval-version="national-signoff-v1"'), "National Admin LIVE approval UI deployment marker is missing.");
assert(liveApprovalUi.includes("Approve LIVE after TEST signoff") && liveApprovalUi.includes("Revoke LIVE approval"), "National Admin LIVE approval UI must expose auditable approve/revoke actions.");
assert(adminLayout.includes('/admin/finance/live-approval') && adminLayout.includes("Live Approval"), "National Admin navigation must expose the PayMongo LIVE approval workflow.");
assert(platformConfig.includes('/admin/finance/live-approval') && platformConfig.includes("PAYMONGO_LIVE_ENABLED=true"), "LIVE server blocker must direct National Admin to the signoff page and Hostinger kill-switch.");
assert(paymongoClient.includes("assertPayMongoLiveApprovalForSecret"), "PayMongo provider client must enforce audited LIVE approval.");
const providerGuardCount = (paymongoClient.match(/await assertProviderActionAllowed\(input\.secretKey\);/g) ?? []).length;
assert(providerGuardCount >= 4, "Every outbound linked PayMongo provider action must enforce the LIVE approval gate.");
assert(memberPaymentsPage.includes('by: ["category"]') && memberPaymentsPage.includes('_sum: { amount: true }'), "Member payment totals must use complete-history aggregates rather than the capped recent-payment list.");
assert(memberPaymentsPage.includes("availableMethods={paymentRuntime.methods}"), "Member payment actions must receive the exact Chapter-enabled payment methods.");
assert(splitPaymentAction.includes("availableMethods.map"), "Payment UI must render only Chapter-enabled payment methods.");
assert(!splitPaymentAction.includes('(["qrph", "gcash", "paymaya"] as PaymentMethod[]).map'), "Payment UI must not hard-code unavailable methods.");
assert(payButton.includes("availableMethods={availableMethods}") && otherPaymentForm.includes("availableMethods={availableMethods}"), "Every dues, contribution and other payment action must enforce the Chapter-enabled methods in the UI.");
assert(assessmentRoute.includes('"SELECTED_CHAPTERS"') && assessmentRoute.includes('"MEMBERS"'), "Admin payment assignment must support selected Chapters and selected members.");
assert(assessmentRoute.includes("memberIds") && assessmentRoute.includes("chapterIds"), "Admin payment assignment API must accept explicit member and Chapter targets.");
assert(financeManager.includes('value="SELECTED_CHAPTERS"') && financeManager.includes('value="MEMBERS"'), "Finance Admin UI must expose selected Chapter and selected member payment assignment.");
assert(financeManager.includes('name="memberIds"') && financeManager.includes('name="chapterIds"'), "Finance Admin UI must submit explicit selected member and Chapter payment targets.");
assert(healthRoute.includes('paymentAssignmentVersion: "chapter-selected-member-v1"'), "Health marker for selected payment assignment is missing.");

assert(publicPage.includes('data-public-chapter-feed-version="global-chapter-feed-v2"'), "Public global Chapter feed marker is missing.");
assert(publicPage.includes("prisma.announcement.findMany"), "Public announcement aggregation is missing.");
assert(publicPage.includes("isPublic: true"), "Public homepage announcements are not explicitly restricted to public records.");
assert(publicPage.includes("prisma.event.findMany"), "Public event aggregation is missing.");
assert(publicPage.includes("Public announcement feed unavailable") && publicPage.includes("Public event feed unavailable"), "Public homepage announcements and events must fail independently instead of crashing the whole feed.");
assert(eventManager.includes("public PSP website"), "Event Admin UI must clearly explain that published events appear on the public PSP website.");
assert(healthRoute.includes('publicFeedVersion: "global-chapter-feed-v2"'), "Health marker for public feed hardening is missing.");
assert(announcementRoute.includes("isPublic: z.boolean().optional().default(false)"), "Announcement API does not default public visibility to false.");
assert(announcementRoute.includes("isPublic: input.isPublic"), "Announcement API does not persist explicit public visibility.");
assert(announcementManager.includes('name="isPublic"'), "Announcement Admin UI lacks explicit public publication control.");
assert(productionBuildInit.includes("PUBLIC_ANNOUNCEMENT_COLUMNS"), "Production schema initializer does not track public announcement visibility.");
assert(readinessRoute.includes("publicAnnouncementSchemaReady"), "Readiness does not verify the public announcement schema.");

assert(memberRoute.includes('requirePermission("members.manage", member.chapterId)'), "Admin member editing does not enforce exact member Chapter scope.");
assert(memberRoute.includes("MEMBER_PROFILE_UPDATED_ADMIN"), "Admin member edit audit contract is missing.");
assert(!memberRoute.includes("membershipNo: requiredName"), "Generic member editing must not mutate membership number.");

assert(certificateRoute.includes('certificateType: z.enum(certificateTypes)'), "Custom certificate type validation is missing.");
assert(certificateRoute.includes("memberIds"), "Bulk certificate recipient contract is missing.");
assert(certificateRoute.includes("selectAll"), "All-active-Chapter certificate issuance contract is missing.");
assert(certificateRoute.includes('hasPermission(context, "certificates.manage", member.chapterId)'), "Certificate issuance does not reapply recipient Chapter authorization.");
assert(certificateRoute.includes("sendCertificateIssuedEmail"), "Admin certificate issuance must attempt member email delivery.");
assert(certificateRoute.includes("CERTIFICATE_EMAIL_SENT") && certificateRoute.includes("CERTIFICATE_EMAIL_FAILED"), "Certificate email delivery must create success/failure audit evidence.");
assert(certificateRoute.includes("export async function DELETE"), "Certificate Admin API must expose Delete/Invalidate.");
assert(certificateRoute.includes("CERTIFICATE_DELETED_INVALIDATED"), "Delete/Invalidate must preserve explicit audit evidence.");
assert(certificateRoute.includes('data: { status: "REVOKED", revokedAt, revocationReason: reason }'), "Delete/Invalidate must soft-revoke instead of physically deleting the certificate record.");
assert(certificatePage.includes("validCertificates.map"), "Member certificate page does not render all valid assigned certificates.");
assert(verificationPage.includes('data-certificate-verification-version="custom-metadata-v2"'), "Certificate verification invalidation marker is missing.");
assert(verificationPage.includes("INVALID ·"), "Revoked certificate verification must display INVALID status.");
assert(verificationPage.includes("/api/public/chapters/"), "Certificate verification must show the issuing Chapter logo.");
assert(certificateGenerator.includes("chapterLogoUrl: string | null"), "Certificate PDF generator must receive the issuing Chapter logo.");
assert(certificateGenerator.includes("privateMediaStorageKey(chapterLogoUrl)"), "Certificate PDF generator must resolve PSP-managed Chapter logo storage.");
assert(certificateGenerator.includes("readPrivateFile(storageKey)"), "Certificate PDF generator must read the stored Chapter logo bytes.");
assert(certificateGenerator.includes("sharp(source)"), "Certificate PDF generator must normalize Chapter JPG/PNG/WEBP logos before embedding.");
assert(certificateDelivery.includes("attachments") && certificateDelivery.includes("application/pdf"), "Certificate email must attach the generated PDF.");
assert(certificateDelivery.includes("signatoryName") && certificateDelivery.includes("Fraternally"), "Certificate email must include the issuing Chairman signature context.");
assert(certificatePdfRoute.includes('certificate.status !== "VALID"') && certificatePdfRoute.includes("status: 410"), "Revoked certificates must fail closed at the PDF endpoint.");
assert(certificatePdfRoute.includes("chapterLogoUrl: certificate.chapter.logoUrl"), "Certificate PDF route must pass the issuing Chapter logo into the generator.");
assert(certificateManager.includes("Delete / Invalidate"), "Certificate Admin UI must expose Delete / Invalidate.");
assert(certificateManager.includes('method: "DELETE"'), "Certificate Delete / Invalidate UI must call the audited DELETE API.");

assert(adminCss.includes(".admin-responsive-table"), "Administration table standard CSS is missing.");
assert(adminCss.includes('content: attr(data-label)'), "Administration mobile record-card transformation is missing.");
assert(adminCss.includes(".admin-pagination"), "Administration pagination standard CSS is missing.");

console.log("PSP platform hardening source contracts passed.");
