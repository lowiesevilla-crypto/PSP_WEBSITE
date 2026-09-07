import { createHmac, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { spawn } from "node:child_process";
import http from "node:http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APP_PORT = 3001;
const MOCK_PORT = 3999;
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const CHAPTER_ADMIN_EMAIL = "ci-alpha-admin@example.invalid";
const CHAPTER_ADMIN_PASSWORD = "CI-Chapter-Admin-Password-2026!";
const NATIONAL_ADMIN_EMAIL = "ci-system-admin@example.invalid";
const NATIONAL_ADMIN_PASSWORD = "ci-only-bootstrap-password-2026";
const MEMBER_EMAIL = "ci-billing-member@example.invalid";
const MEMBER_PASSWORD = "CI-Billing-Member-Password-2026!";
const CHILD_ACCOUNT_ID = "org_CIBillingChild";
const PLATFORM_ACCOUNT_ID = "org_CIPlatformAccount";
const WEBHOOK_SECRET = "ci-billing-webhook-secret";
const CHAPTER_DUES_TITLE = "CI E2E Chapter Dues 2026-09";
const NATIONAL_DUES_TITLE = "CI E2E National Dues 2026-09";
const SPLIT_AUDIT_ACTION = "PAYMONGO_SPLIT_PAYMENT_INTENT_CREATED";

const captured = { webhook: null, paymentIntent: null, paymentMethod: null, attach: null };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scryptPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scryptCallback(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
      if (error) return reject(error);
      resolve(["scrypt-v1", 32768, 8, 1, salt.toString("base64url"), Buffer.from(derived).toString("base64url")].join("$"));
    });
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

async function startPayMongoMock() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${MOCK_PORT}`);
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value]));

      if (request.method === "POST" && url.pathname === "/v1/webhooks") {
        captured.webhook = { body, headers };
        return sendJson(response, 200, { data: { id: "wh_ci_billing", attributes: { secret_key: WEBHOOK_SECRET, status: "enabled" } } });
      }
      if (request.method === "POST" && url.pathname === "/v1/payment_intents") {
        captured.paymentIntent = { body, headers };
        return sendJson(response, 200, { data: { id: "pi_ci_split", attributes: { client_key: "pi_ci_split_client_key", status: "awaiting_payment_method" } } });
      }
      if (request.method === "POST" && url.pathname === "/v1/payment_methods") {
        captured.paymentMethod = { body, headers };
        return sendJson(response, 200, { data: { id: "pm_ci_qrph" } });
      }
      if (request.method === "POST" && url.pathname === "/v1/payment_intents/pi_ci_split/attach") {
        captured.attach = { body, headers };
        return sendJson(response, 200, {
          data: {
            id: "pi_ci_split",
            attributes: {
              status: "awaiting_next_action",
              next_action: { code: { image_url: "https://example.invalid/ci-qr.png", test_url: "https://example.invalid/ci-paymongo-test-helper" } },
            },
          },
        });
      }
      return sendJson(response, 404, { errors: [{ detail: `No CI PayMongo mock route for ${request.method} ${url.pathname}` }] });
    } catch (error) {
      return sendJson(response, 500, { errors: [{ detail: error instanceof Error ? error.message : "CI mock failure" }] });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(MOCK_PORT, "127.0.0.1", resolve);
  });
  return server;
}

function startApp() {
  const testSecretKey = ["sk", "test", "ci", "platform", "secret"].join("_");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(APP_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      PAYMONGO_API_BASE_URL: MOCK_URL,
      PAYMONGO_PLATFORM_SECRET_KEY: testSecretKey,
      PAYMONGO_PLATFORM_ACCOUNT_ID: PLATFORM_ACCOUNT_ID,
      PLATFORM_CONVENIENCE_FEE_BPS: "0",
      PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS: "500",
      PAYMONGO_LIVE_ENABLED: "false",
    },
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[billing-e2e-app] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[billing-e2e-app] ${chunk}`));
  return child;
}

async function waitForApp() {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // App is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Isolated PSP billing E2E server did not become ready.");
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL, "Sec-Fetch-Site": "same-origin" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  assert(response.status === 200, `Login failed for ${email}: ${response.status} ${JSON.stringify(payload)}`);
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, `Login for ${email} did not return a session cookie.`);
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

async function clearPriorBillingRuns() {
  const assessments = await prisma.assessment.findMany({
    where: { title: { in: [CHAPTER_DUES_TITLE, NATIONAL_DUES_TITLE] } },
    select: { id: true },
  });
  const assessmentIds = assessments.map((item) => item.id);
  if (!assessmentIds.length) return;
  const paymentIds = (await prisma.payment.findMany({ where: { assessmentId: { in: assessmentIds } }, select: { id: true } })).map((item) => item.id);
  if (paymentIds.length) {
    await prisma.paymentTransaction.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.receipt.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.memberLedgerEntry.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.auditLog.deleteMany({ where: { entityType: "Payment", entityId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  }
  await prisma.memberLedgerEntry.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
  await prisma.auditLog.deleteMany({ where: { entityType: "Assessment", entityId: { in: assessmentIds } } });
  await prisma.assessment.deleteMany({ where: { id: { in: assessmentIds } } });
}

async function upsertBillingMember({ email, userId, memberId, membershipNo, chapterId, lastName, passwordHash, roleId }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: `CI Billing ${lastName} Member`, status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash },
    create: { id: userId, email, displayName: `CI Billing ${lastName} Member`, status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash },
  });
  const member = await prisma.member.upsert({
    where: { userId: user.id },
    update: { chapterId, membershipNo, firstName: "Billing", lastName, membershipStatus: "ACTIVE" },
    create: { id: memberId, userId: user.id, chapterId, membershipNo, firstName: "Billing", lastName, membershipStatus: "ACTIVE", joinedAt: new Date("2026-01-01T00:00:00.000Z") },
  });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.userRoleAssignment.create({ data: { userId: user.id, roleId, chapterId } });
  return member;
}

async function prepareFixtures() {
  const [chapterA, chapterB, memberRole] = await Promise.all([
    prisma.chapters.findUnique({ where: { id: "ci-chapter-alpha" } }),
    prisma.chapters.findUnique({ where: { id: "ci-chapter-beta" } }),
    prisma.role.findUnique({ where: { code: "MEMBER" } }),
  ]);
  assert(chapterA && chapterB && memberRole, "Billing E2E requires isolation fixtures and MEMBER role.");
  await clearPriorBillingRuns();
  await prisma.chapterPaymentConfig.deleteMany({ where: { chapterId: chapterA.id } });
  const passwordHash = await scryptPassword(MEMBER_PASSWORD);
  const member = await upsertBillingMember({
    email: MEMBER_EMAIL,
    userId: "ci-billing-member-user",
    memberId: "ci-billing-member",
    membershipNo: "CI-BILLING-MEMBER-001",
    chapterId: chapterA.id,
    lastName: "Alpha",
    passwordHash,
    roleId: memberRole.id,
  });
  const betaMember = await upsertBillingMember({
    email: "ci-billing-beta@example.invalid",
    userId: "ci-billing-beta-member-user",
    memberId: "ci-billing-beta-member",
    membershipNo: "CI-BILLING-BETA-001",
    chapterId: chapterB.id,
    lastName: "Beta",
    passwordHash,
    roleId: memberRole.id,
  });
  return { chapterA, chapterB, member, betaMember };
}

async function main() {
  const fixtures = await prepareFixtures();
  const mock = await startPayMongoMock();
  const app = startApp();

  try {
    await waitForApp();

    const chapterAdminCookie = await login(CHAPTER_ADMIN_EMAIL, CHAPTER_ADMIN_PASSWORD);
    const adminFinance = await request("/admin/finance", chapterAdminCookie);
    const adminFinanceHtml = await adminFinance.text();
    assert(adminFinance.status === 200, `Chapter Admin finance page returned ${adminFinance.status}.`);
    assert(adminFinanceHtml.includes('data-dues-billing-version="chapter-national-v1"'), "Chapter Admin finance page is missing the dedicated dues billing workflow.");
    assert(adminFinanceHtml.includes("Create Dues / Bill"), "Chapter Admin finance page does not expose Create Dues / Bill.");
    assert(adminFinanceHtml.includes("CI Alpha Chapter"), "Chapter Admin finance page does not expose its authorized Chapter.");
    assert(!adminFinanceHtml.includes("CI Beta Chapter"), "Chapter Admin finance page leaked a foreign Chapter.");

    const chapterBill = await request("/api/admin/finance/assessments", chapterAdminCookie, {
      method: "POST",
      body: JSON.stringify({
        billingScope: "CHAPTER",
        chapterId: fixtures.chapterA.id,
        assessmentTypeCode: "MONTHLY_DUES",
        title: CHAPTER_DUES_TITLE,
        description: "CI E2E Chapter billing contract",
        amount: 100,
        dueAt: "2026-09-30T15:59:59.000Z",
      }),
    });
    const chapterBillPayload = await chapterBill.json().catch(() => ({}));
    assert(chapterBill.status === 201, `Chapter Admin could not create own Chapter dues: ${chapterBill.status} ${JSON.stringify(chapterBillPayload)}`);
    assert(chapterBillPayload.billingScope === "CHAPTER" && chapterBillPayload.chargedMembers >= 1, "Chapter dues response is incomplete.");
    const chapterAssessmentId = chapterBillPayload.assessment?.id;
    assert(chapterAssessmentId, "Chapter dues response did not return an assessment id.");
    const chapterCharge = await prisma.memberLedgerEntry.findFirst({ where: { memberId: fixtures.member.id, assessmentId: chapterAssessmentId, type: "CHARGE" } });
    assert(chapterCharge?.amount.toFixed(2) === "100.00", "Chapter member did not receive the ₱100 dues charge.");
    assert(!(await prisma.memberLedgerEntry.findFirst({ where: { memberId: fixtures.betaMember.id, assessmentId: chapterAssessmentId } })), "Chapter dues leaked into a foreign Chapter.");

    const blockedNational = await request("/api/admin/finance/assessments", chapterAdminCookie, {
      method: "POST",
      body: JSON.stringify({ billingScope: "NATIONAL", assessmentTypeCode: "NATIONAL_DUES", title: "CI E2E Escalation Attempt", amount: 50 }),
    });
    assert(blockedNational.status === 403, `Chapter Admin National billing escalation should be 403, received ${blockedNational.status}.`);

    const nationalAdminCookie = await login(NATIONAL_ADMIN_EMAIL, NATIONAL_ADMIN_PASSWORD);
    const nationalFinance = await request("/admin/finance", nationalAdminCookie);
    const nationalFinanceHtml = await nationalFinance.text();
    assert(nationalFinance.status === 200, `National Admin finance page returned ${nationalFinance.status}.`);
    assert(nationalFinanceHtml.includes("National · all active Chapters"), "National Admin billing UI is missing National scope.");
    assert(nationalFinanceHtml.includes("CI Alpha Chapter") && nationalFinanceHtml.includes("CI Beta Chapter"), "National Admin cannot see all active CI Chapters.");

    const nationalBill = await request("/api/admin/finance/assessments", nationalAdminCookie, {
      method: "POST",
      body: JSON.stringify({
        billingScope: "NATIONAL",
        assessmentTypeCode: "NATIONAL_DUES",
        title: NATIONAL_DUES_TITLE,
        description: "CI E2E National billing contract",
        amount: 50,
        dueAt: "2026-09-30T15:59:59.000Z",
      }),
    });
    const nationalBillPayload = await nationalBill.json().catch(() => ({}));
    assert(nationalBill.status === 201, `National Admin could not create National dues: ${nationalBill.status} ${JSON.stringify(nationalBillPayload)}`);
    assert(nationalBillPayload.billingScope === "NATIONAL" && nationalBillPayload.chaptersCharged >= 2, "National dues did not fan out across active Chapters.");
    const alphaNational = (nationalBillPayload.assessments ?? []).find((item) => item.chapterId === fixtures.chapterA.id);
    const betaNational = (nationalBillPayload.assessments ?? []).find((item) => item.chapterId === fixtures.chapterB.id);
    assert(alphaNational && betaNational, "National dues did not create Alpha and Beta Chapter assessments.");
    const [alphaNationalCharge, betaNationalCharge] = await Promise.all([
      prisma.memberLedgerEntry.findFirst({ where: { memberId: fixtures.member.id, assessmentId: alphaNational.id, type: "CHARGE" } }),
      prisma.memberLedgerEntry.findFirst({ where: { memberId: fixtures.betaMember.id, assessmentId: betaNational.id, type: "CHARGE" } }),
    ]);
    assert(alphaNationalCharge?.amount.toFixed(2) === "50.00" && betaNationalCharge?.amount.toFixed(2) === "50.00", "National dues did not charge ₱50 to both test Chapters.");

    const memberCookie = await login(MEMBER_EMAIL, MEMBER_PASSWORD);
    const memberPaymentsBefore = await request("/payments", memberCookie);
    const memberHtmlBefore = await memberPaymentsBefore.text();
    assert(memberPaymentsBefore.status === 200, `Member payments page returned ${memberPaymentsBefore.status}.`);
    assert(memberHtmlBefore.includes(CHAPTER_DUES_TITLE) && memberHtmlBefore.includes(NATIONAL_DUES_TITLE), "Member cannot see both Chapter and National dues.");
    assert(memberHtmlBefore.includes("Amount to Pay"), "Member payments page does not label Amount to Pay.");
    assert(memberHtmlBefore.includes('data-member-amount-to-pay="100.00"') && memberHtmlBefore.includes('data-member-amount-to-pay="50.00"'), "Member amount-to-pay values are not visible for Chapter and National dues.");

    const draft = await request("/api/admin/finance/payment-config", chapterAdminCookie, {
      method: "PUT",
      body: JSON.stringify({ chapterId: fixtures.chapterA.id, mode: "TEST", linkedAccountId: CHILD_ACCOUNT_ID, paymentMethods: ["qrph"], isEnabled: false }),
    });
    const draftPayload = await draft.json().catch(() => ({}));
    assert(draft.status === 200, `Chapter TEST payment draft failed: ${draft.status} ${JSON.stringify(draftPayload)}`);
    const enable = await request("/api/admin/finance/payment-config", chapterAdminCookie, {
      method: "PUT",
      body: JSON.stringify({ chapterId: fixtures.chapterA.id, mode: "TEST", linkedAccountId: CHILD_ACCOUNT_ID, paymentMethods: ["qrph"], isEnabled: true }),
    });
    const enablePayload = await enable.json().catch(() => ({}));
    assert(enable.status === 200 && enablePayload.config?.isEnabled === true, `Chapter TEST activation failed: ${enable.status} ${JSON.stringify(enablePayload)}`);
    assert(captured.webhook?.headers?.["account-id"] === CHILD_ACCOUNT_ID, "TEST activation did not register the child webhook under the linked Chapter account.");

    const memberPaymentsReady = await request("/payments", memberCookie);
    assert((await memberPaymentsReady.text()).includes("ONLINE PAYMENT READY"), "Member payment page did not become ready after TEST activation.");

    const requestId = "11111111-2222-4333-8444-555555555555";
    const checkout = await request("/api/payments/checkout", memberCookie, {
      method: "POST",
      body: JSON.stringify({ category: "DUES", paymentMethod: "qrph", assessmentId: chapterAssessmentId, requestId }),
    });
    const checkoutPayload = await checkout.json().catch(() => ({}));
    assert(checkout.status === 201, `Member split checkout failed: ${checkout.status} ${JSON.stringify(checkoutPayload)}`);
    assert(checkoutPayload.chapterAmount === "100.00" && checkoutPayload.platformFee === "5.00" && checkoutPayload.totalAmount === "105.00", `Checkout did not reconcile ₱100 + ₱5 = ₱105: ${JSON.stringify(checkoutPayload)}`);
    assert(checkoutPayload.testUrl === "https://example.invalid/ci-paymongo-test-helper", "TEST helper URL was not returned.");

    const intent = captured.paymentIntent;
    assert(intent?.headers?.["account-id"] === CHILD_ACCOUNT_ID, "PaymentIntent did not use the linked Chapter Account-Id header.");
    const attributes = intent?.body?.data?.attributes;
    const recipient = attributes?.split_payment?.recipients?.[0];
    assert(attributes?.amount === 10500, `PaymentIntent gross is not 10500 centavos: ${attributes?.amount}`);
    assert(recipient?.merchant_id === PLATFORM_ACCOUNT_ID && recipient?.split_type === "fixed" && recipient?.value === 500, "PayMongo fixed PSP fee recipient is incorrect.");
    assert(attributes?.split_payment?.transfer_to === CHILD_ACCOUNT_ID, "PayMongo transfer_to is not the Chapter linked account.");
    assert(attributes?.metadata?.chapter_amount_centavos === "10000" && attributes?.metadata?.platform_fee_centavos === "500", "PayMongo split metadata does not reconcile Chapter amount and platform fee.");

    const payment = await prisma.payment.findUnique({ where: { internalReference: `PSP-${requestId}` } });
    assert(payment?.amount.toFixed(2) === "100.00", `Payment.amount must store Chapter entitlement only, received ${payment?.amount?.toFixed?.(2)}.`);
    assert(payment?.gatewayReference === "pi_ci_split", "Payment did not persist the PayMongo PaymentIntent reference.");
    const splitAudit = await prisma.auditLog.findFirst({ where: { action: SPLIT_AUDIT_ACTION, entityType: "Payment", entityId: payment.id }, orderBy: { createdAt: "desc" } });
    const splitMeta = splitAudit?.metadataJson ?? {};
    assert(splitAudit && splitMeta.chapterAmount === "100.00" && splitMeta.platformFee === "5.00" && splitMeta.totalAmount === "105.00", `Persisted split audit does not reconcile: ${JSON.stringify(splitMeta)}`);

    const event = {
      data: {
        id: "evt_ci_billing_paid",
        attributes: {
          type: "payment.paid",
          data: { id: "pay_ci_billing_paid", attributes: { payment_intent_id: "pi_ci_split", status: "paid", amount: 10500, source: { type: "qrph" } } },
        },
      },
    };
    const rawEvent = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${rawEvent}`, "utf8").digest("hex");
    const webhook = await fetch(`${BASE_URL}/api/webhooks/paymongo/CI_ALPHA`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Paymongo-Signature": `t=${timestamp},te=${signature}` },
      body: rawEvent,
    });
    const webhookPayload = await webhook.json().catch(() => ({}));
    assert(webhook.status === 200 && webhookPayload.status === "PAID", `Signed TEST paid webhook failed: ${webhook.status} ${JSON.stringify(webhookPayload)}`);

    const [paidPayment, ledgerPayment, receipt] = await Promise.all([
      prisma.payment.findUnique({ where: { id: payment.id } }),
      prisma.memberLedgerEntry.findFirst({ where: { paymentId: payment.id, type: "PAYMENT" } }),
      prisma.receipt.findUnique({ where: { paymentId: payment.id } }),
    ]);
    assert(paidPayment?.status === "PAID", "Paid webhook did not mark Payment PAID.");
    assert(ledgerPayment?.amount.toFixed(2) === "100.00", `Paid webhook must credit only ₱100 Chapter entitlement, received ${ledgerPayment?.amount?.toFixed?.(2)}.`);
    assert(receipt?.receiptNumber, "Paid webhook did not create a receipt.");

    const memberPaymentsAfter = await request("/payments", memberCookie);
    const memberHtmlAfter = await memberPaymentsAfter.text();
    assert(memberPaymentsAfter.status === 200, `Member payments page after payment returned ${memberPaymentsAfter.status}.`);
    assert(!memberHtmlAfter.includes('data-member-amount-to-pay="100.00"'), "Fully paid Chapter dues remain in the member outstanding amount-to-pay list.");
    assert(memberHtmlAfter.includes('data-member-amount-to-pay="50.00"') && memberHtmlAfter.includes(NATIONAL_DUES_TITLE), "Unpaid National dues disappeared after Chapter dues payment.");
    assert(memberHtmlAfter.includes("105.00") && memberHtmlAfter.includes("100.00") && memberHtmlAfter.includes("5.00"), "Payment history does not display gross, Chapter amount and platform fee.");
    assert(memberHtmlAfter.includes(receipt.receiptNumber), "Payment history does not show the generated receipt number.");

    console.log(JSON.stringify({
      status: "PASS",
      chapterAdminBilling: true,
      nationalAdminBilling: true,
      memberAmountVisibility: true,
      splitPayment: { chapterAmount: "100.00", platformFee: "5.00", gross: "105.00", transferTo: CHILD_ACCOUNT_ID, recipient: PLATFORM_ACCOUNT_ID },
      paidWebhookLedgerAmount: ledgerPayment.amount.toFixed(2),
      receiptNumber: receipt.receiptNumber,
    }, null, 2));
  } finally {
    app.kill("SIGTERM");
    await new Promise((resolve) => mock.close(resolve));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
