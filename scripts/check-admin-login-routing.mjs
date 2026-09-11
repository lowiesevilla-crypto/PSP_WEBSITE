import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [loginPage, loginForm] = await Promise.all([
  source("src/app/login/page.tsx"),
  source("src/components/auth/login-form.tsx"),
]);

for (const [name, file] of [["server login page", loginPage], ["client login form", loginForm]]) {
  assert(file.includes("hasAdminAccess"), `${name} must route any authorized administrator to /admin.`);
  assert(!file.includes("hasNationalAdminAccess"), `${name} must not limit admin entry to National Admin.`);
  assert(!file.includes("assignment.chapterId === null"), `${name} must allow chapter-scoped administrator assignments.`);
  assert(file.includes('"applications.review"') && file.includes('"members.manage"'), `${name} must recognize Chapter Admin permissions.`);
}

assert(loginPage.includes('redirect(hasAdminAccess ? "/admin" : "/member")'), "Authenticated server-side login routing is not using scoped admin access.");
assert(loginForm.includes('router.replace(hasAdminAccess ? "/admin" : "/member")'), "Client-side password/passkey login routing is not using scoped admin access.");

console.log("Admin login routing contract passed for National and chapter-scoped administrators.");
