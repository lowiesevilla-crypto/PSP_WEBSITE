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
] = await Promise.all([
  source("prisma/schema.prisma"),
  source("src/app/api/admin/finance/payment-config/route.ts"),
  source("src/lib/paymongo/chapter-config.ts"),
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
]);

assert(schema.includes('certificateType   String            @default("MEMBERSHIP")'), "Certificate type metadata is missing from Prisma schema.");
assert(schema.includes('title             String            @default("Certificate of Membership")'), "Certificate title metadata is missing from Prisma schema.");
assert(schema.includes("@@unique([batchId, memberId])"), "Certificate batch/recipient idempotency constraint is missing.");
assert(schema.includes("isPublic  Boolean       @default(false)"), "Public announcement visibility must default fail-closed in Prisma schema.");

assert(paymentRoute.includes("PENDING_LINKED_WEBHOOK_SECRET"), "Payment draft marker contract is missing.");
assert(paymentRoute.includes("if (input.isEnabled)"), "Payment activation is not separated from draft save.");
assert(paymentRoute.includes("createLinkedWebhook"), "Payment activation no longer provisions the linked child webhook.");
assert(paymentRuntime.includes("isPendingLinkedWebhookSecret"), "Runtime payment configuration does not reject staged webhook state.");

assert(publicPage.includes('data-public-chapter-feed-version="global-chapter-feed-v1"'), "Public global Chapter feed marker is missing.");
assert(publicPage.includes("prisma.announcement.findMany"), "Public announcement aggregation is missing.");
assert(publicPage.includes("isPublic: true"), "Public homepage announcements are not explicitly restricted to public records.");
assert(publicPage.includes("prisma.event.findMany"), "Public event aggregation is missing.");
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
assert(certificatePage.includes("validCertificates.map"), "Member certificate page does not render all valid assigned certificates.");
assert(verificationPage.includes('data-certificate-verification-version="custom-metadata-v1"'), "Custom certificate verification marker is missing.");

assert(adminCss.includes(".admin-responsive-table"), "Administration table standard CSS is missing.");
assert(adminCss.includes('content: attr(data-label)'), "Administration mobile record-card transformation is missing.");
assert(adminCss.includes(".admin-pagination"), "Administration pagination standard CSS is missing.");

console.log("PSP platform hardening source contracts passed.");
