const BASE_URL = "http://127.0.0.1:3000";
const ORIGIN = "https://psp.hoahub.tech";
const ADMIN_EMAIL = "ci-alpha-admin@example.invalid";
const ADMIN_PASSWORD = "CI-Chapter-Admin-Password-2026!";
const MEMBER_EMAIL = "ci-alpha-member@example.invalid";
const ALPHA_MEMBER_ID = "ci-alpha-member";
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

console.log("Validating Chapter Admin activation override and forced permanent-password flow...");

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
assert(!extractCookie(temporaryLogin.response, "psp_session") || extractCookie(temporaryLogin.response, "psp_session") === "psp_session=", "Temporary password login must not issue a usable full PSP session.");

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

console.log("Admin activation override E2E passed: scoped override, temporary login restriction, forced permanent password, and reset invalidation.");
