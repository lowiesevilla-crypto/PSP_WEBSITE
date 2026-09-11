import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";
const ORIGIN = "https://psp.hoahub.tech";
const ADMIN_EMAIL = "ci-alpha-admin@example.invalid";
const ADMIN_PASSWORD = "CI-Chapter-Admin-Password-2026!";
const MEMBER_EMAIL = "ci-activation-member@example.invalid";
const MEMBER_USER_ID = "ci-activation-member-user";
const ALPHA_MEMBER_ID = "ci-activation-member";
const ALPHA_CHAPTER_ID = "ci-chapter-alpha";
const BETA_MEMBER_ID = "ci-beta-member";
const TEMP_PASSWORD = "CI-Temporary-Member-Password-2026!";
const PERMANENT_PASSWORD = "CI-Permanent-Member-Password-2026!";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const combined = response.headers.get("set-cookie");
  return combined ? [combined] : [];
}

function extractCookie(response, name) {
  for (const header of getSetCookies(response)) {
    const match = header.match(new RegExp(`(?:^|,\\s*)${name}=([^;]*)`));
    if (match) return `${name}=${match[1]}`;
  }
  return null;
}

async function json(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function prepareActivationFixture() {
  const [chapter, memberRole] = await Promise.all([
    prisma.chapters.findUnique({ where: { id: ALPHA_CHAPTER_ID }, select: { id: true } }),
    prisma.role.findUnique({ where: { code: "MEMBER" }, select: { id: true } }),
  ]);
  assert(chapter, "CI Alpha Chapter fixture is missing.");
  assert(memberRole, "MEMBER role fixture is missing.");

  const user = await prisma.user.upsert({
    where: { email: MEMBER_EMAIL },
    update: {
      displayName: "CI Activation Member",
      status: "INVITED",
      passwordHash: null,
      emailVerifiedAt: null,
    },
    create: {
      id: MEMBER_USER_ID,
      email: MEMBER_EMAIL,
      displayName: "CI Activation Member",
      status: "INVITED",
    },
  });

  const member = await prisma.member.upsert({
    where: { userId: user.id },
    update: {
      chapterId: ALPHA_CHAPTER_ID,
      membershipNo: "CI-ACTIVATION-MEMBER-001",
      firstName: "Activation",
      lastName: "Member",
      membershipStatus: "ACTIVE",
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    create: {
      id: ALPHA_MEMBER_ID,
      userId: user.id,
      chapterId: ALPHA_CHAPTER_ID,
      membershipNo: "CI-ACTIVATION-MEMBER-001",
      firstName: "Activation",
      lastName: "Member",
      membershipStatus: "ACTIVE",
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.userRoleAssignment.create({
    data: { userId: user.id, roleId: memberRole.id, chapterId: ALPHA_CHAPTER_ID },
  });

  await prisma.membershipHistory.deleteMany({ where: { memberId: member.id } });
  await prisma.membershipHistory.create({
    data: {
      memberId: member.id,
      chapterId: ALPHA_CHAPTER_ID,
      status: "ACTIVE",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      reason: "CI activation override fixture",
    },
  });
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return { response, body: await json(response) };
}

async function adminOverride(memberId, cookie, body) {
  const response = await fetch(`${BASE_URL}/api/admin/members/${memberId}/activation-override`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      Cookie: cookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return { response, body: await json(response) };
}

try {
  console.log("Validating Chapter Admin activation override and forced permanent-password flow...");
  await prepareActivationFixture();

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert(adminLogin.response.status === 200, `Chapter Admin login failed: ${adminLogin.response.status} ${JSON.stringify(adminLogin.body)}`);
  const adminCookie = extractCookie(adminLogin.response, "psp_session");
  assert(adminCookie, "Chapter Admin login did not issue a PSP session cookie.");

  const crossChapter = await adminOverride(BETA_MEMBER_ID, adminCookie, {
    action: "SET_TEMPORARY_PASSWORD",
    temporaryPassword: TEMP_PASSWORD,
  });
  assert(crossChapter.response.status === 403, `Chapter Admin cross-chapter override must fail with 403, got ${crossChapter.response.status}.`);

  const setTemporary = await adminOverride(ALPHA_MEMBER_ID, adminCookie, {
    action: "SET_TEMPORARY_PASSWORD",
    temporaryPassword: TEMP_PASSWORD,
  });
  assert(setTemporary.response.status === 200, `Temporary-password activation failed: ${setTemporary.response.status} ${JSON.stringify(setTemporary.body)}`);
  assert(setTemporary.body.passwordChangeRequired === true, "Temporary activation must report forced permanent password change.");

  const temporaryLogin = await login(MEMBER_EMAIL, TEMP_PASSWORD);
  assert(temporaryLogin.response.status === 200, `Temporary-password member login failed: ${temporaryLogin.response.status} ${JSON.stringify(temporaryLogin.body)}`);
  assert(temporaryLogin.body.passwordChangeRequired === true, "Temporary password login must require permanent password creation.");
  const tempCookie = extractCookie(temporaryLogin.response, "psp_temp_password");
  assert(tempCookie, "Temporary password login did not issue the restricted password-change cookie.");
  const fullSessionFromTemporaryLogin = extractCookie(temporaryLogin.response, "psp_session");
  assert(!fullSessionFromTemporaryLogin || fullSessionFromTemporaryLogin === "psp_session=", "Temporary password login must not issue a usable full PSP session.");

  const memberContextWhileTemporary = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: tempCookie, Accept: "application/json" },
  });
  assert(memberContextWhileTemporary.status === 401, `Restricted temporary-password session must not access /api/auth/me; got ${memberContextWhileTemporary.status}.`);

  const samePasswordAttempt = await fetch(`${BASE_URL}/api/auth/change-temporary-password`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      Cookie: tempCookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ password: TEMP_PASSWORD }),
  });
  assert(samePasswordAttempt.status === 400, `Permanent password must differ from temporary password; got ${samePasswordAttempt.status}.`);

  const permanentChange = await fetch(`${BASE_URL}/api/auth/change-temporary-password`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      Cookie: tempCookie,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ password: PERMANENT_PASSWORD }),
  });
  const permanentBody = await json(permanentChange);
  assert(permanentChange.status === 200, `Permanent password change failed: ${permanentChange.status} ${JSON.stringify(permanentBody)}`);
  const memberSession = extractCookie(permanentChange, "psp_session");
  assert(memberSession, "Permanent password completion did not issue a full PSP session.");

  const activeContext = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: memberSession, Accept: "application/json" },
  });
  const activeContextBody = await json(activeContext);
  assert(activeContext.status === 200 && activeContextBody.authenticated === true, "Member must receive normal authenticated access after permanent password creation.");

  const permanentLogin = await login(MEMBER_EMAIL, PERMANENT_PASSWORD);
  assert(permanentLogin.response.status === 200, "Permanent password must work after forced password change.");
  assert(permanentLogin.body.passwordChangeRequired === false, "Permanent-password login must not remain in forced-change state.");

  const resetActivation = await adminOverride(ALPHA_MEMBER_ID, adminCookie, { action: "RESET_ACTIVATION" });
  assert(resetActivation.response.status === 200, `Activation reset failed: ${resetActivation.response.status} ${JSON.stringify(resetActivation.body)}`);

  const stalePermanentLogin = await login(MEMBER_EMAIL, PERMANENT_PASSWORD);
  assert(stalePermanentLogin.response.status === 401, "Activation reset must invalidate the member's prior password immediately.");

  const finalState = await prisma.user.findUnique({
    where: { id: MEMBER_USER_ID },
    select: { status: true, passwordHash: true, emailVerifiedAt: true },
  });
  assert(finalState?.status === "INVITED" && finalState.passwordHash === null && finalState.emailVerifiedAt === null, "Activation reset must return the test account to the normal invitation state.");

  console.log("Admin activation override E2E passed: scoped override, temporary login restriction, forced permanent password, and reset invalidation.");
} finally {
  await prisma.$disconnect();
}
