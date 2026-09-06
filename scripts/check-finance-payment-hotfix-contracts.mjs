import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [financeManager, assessmentRoute, paymentsPage, chapterRuntime, checkoutRoute, webhookRoute, receiptGenerator, splitMetadata, paymongoClient] = await Promise.all([
  source("src/components/admin/finance-manager.tsx"),
  source("src/app/api/admin/finance/assessments/route.ts"),
  source("src/app/payments/page.tsx"),
  source("src/lib/paymongo/chapter-config.ts"),
  source("src/app/api/payments/checkout/route.ts"),
  source("src/app/api/webhooks/paymongo/[chapterCode]/route.ts"),
  source("src/lib/receipts/generator.ts"),
  source("src/lib/paymongo/split-metadata.ts"),
  source("src/lib/paymongo/client.ts"),
]);

assert(financeManager.includes('view: "rates"') && financeManager.includes('notice: "rate"'), "Saved effective-dated rates must navigate to persisted Rates evidence.");
assert(financeManager.includes('view: "assessments"') && financeManager.includes('chargedMembers'), "Posted assessments must navigate to persisted Assessments evidence with charged-member visibility.");
assert(financeManager.includes('Saving rate…') && financeManager.includes('Posting to active members…'), "Finance mutations must expose in-progress UI feedback and prevent ambiguous double submission.");

assert(assessmentRoute.includes('membershipStatus: "ACTIVE"'), "Assessment posting must remain limited to ACTIVE members in the selected Chapter.");
assert(assessmentRoute.includes("tx.memberLedgerEntry.createMany"), "Assessment posting must persist member ledger charges transactionally.");
assert(assessmentRoute.includes('action: "ASSESSMENT_POSTED"'), "Assessment posting audit evidence is missing.");
assert(assessmentRoute.includes("chargedMembers: members.length"), "Assessment posting must return exact charged-member count.");

assert(paymentsPage.includes("getChapterPayMongoReadiness(member.chapterId)"), "Member Payments must evaluate the exact member Chapter runtime readiness.");
assert(paymentsPage.includes("data-member-payment-readiness"), "Member Payments must expose a safe readiness state for support visibility.");
assert(paymentsPage.includes("Exact member Chapter") && paymentsPage.includes("member.chapter.code"), "Member Payments must identify the exact Chapter/code used for ledger and payment configuration.");
assert(!paymentsPage.includes('() => ({ ready: false as const, methods: [] as string[] })'), "Member Payments must not swallow every PayMongo readiness failure into a generic unavailable state.");

assert(chapterRuntime.includes("getChapterPayMongoReadiness"), "Structured Chapter PayMongo readiness helper is missing.");
assert(chapterRuntime.includes('reasonCode: "CHAPTER_DISABLED"') && chapterRuntime.includes('reasonCode: "MODE_MISMATCH"'), "Chapter PayMongo readiness must distinguish safe Chapter configuration blockers.");
assert(chapterRuntime.includes("isPendingLinkedWebhookSecret"), "Chapter PayMongo runtime must fail closed while child webhook signing is pending.");
assert(chapterRuntime.includes("platform.mode !== mode"), "Chapter PayMongo runtime must reject Chapter/platform mode mismatch.");

assert(checkoutRoute.includes("getChapterPayMongoConfig(member.chapterId)"), "Checkout must remain scoped to the current member Chapter configuration.");
assert(checkoutRoute.includes("getAssessmentOutstanding(member.id, assessment.id)"), "Checkout must calculate assessment outstanding server-side for the current member.");
assert(checkoutRoute.includes("createLinkedSplitPaymentIntent"), "Checkout must create a linked split-payment intent.");
assert(checkoutRoute.includes("chapterAmountCentavos") && checkoutRoute.includes("platformFeeCentavos") && checkoutRoute.includes("totalAmountCentavos"), "Checkout must persist Chapter/platform/gross split evidence.");
assert(checkoutRoute.includes("SPLIT_PAYMENT_AUDIT_ACTION"), "Checkout split audit contract is missing.");

assert(paymongoClient.includes("assertPayMongoLiveApprovalForSecret"), "Outbound PayMongo provider actions must remain protected by audited LIVE approval.");

assert(webhookRoute.includes("gatewayEventId"), "PayMongo webhook idempotency evidence is missing.");
assert(webhookRoute.includes("memberLedgerEntry") && webhookRoute.includes('type: "PAYMENT"'), "Paid webhook must post the member ledger payment.");
assert(webhookRoute.includes("receipt.upsert") || webhookRoute.includes("receipt.create"), "Paid webhook must generate or persist a receipt.");
assert(webhookRoute.includes("PAYMONGO_SPLIT_PAYMENT_POSTED"), "Paid webhook must persist split-posting audit evidence.");
assert(webhookRoute.includes("split.chapterAmount") && webhookRoute.includes("split.platformFee") && webhookRoute.includes("split.totalAmount"), "Paid webhook must reconcile the persisted split amounts.");

assert(splitMetadata.includes("PAYMONGO_SPLIT_PAYMENT_INTENT_CREATED"), "Split metadata must be read from the persisted PayMongo intent audit.");
assert(receiptGenerator.includes("Chapter Amount") && receiptGenerator.includes("Platform Convenience Fee") && receiptGenerator.includes("Total Paid"), "Digital receipt must show Chapter amount, PSP fee and total paid separately.");

console.log("PSP finance/payment hotfix source contracts passed.");
