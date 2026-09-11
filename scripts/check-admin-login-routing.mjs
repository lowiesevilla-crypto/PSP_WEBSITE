import { readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [loginPage, loginForm, adminLayout, memberPage] = await Promise.all([
  source("src/app/login/page.tsx"),
  source("src/components/auth/login-form.tsx"),
  source("src/app/admin/layout.tsx"),
  source("src/app/member/page.tsx"),
]);

for (const [name, file] of [["server login page", loginPage], ["client login form", loginForm]]) {
  assert(file.includes("hasAdminAccess"), `${name} must route any authorized administrator to /admin.`);
  assert(!file.includes("hasNationalAdminAccess"), `${name} must not limit admin entry to National Admin.`);
  assert(!file.includes("assignment.chapterId === null"), `${name} must allow chapter-scoped administrator assignments.`);
  assert(file.includes('"applications.review"') && file.includes('"members.manage"'), `${name} must recognize Chapter Admin permissions.`);
}

assert(loginPage.includes('redirect(hasAdminAccess ? "/admin" : "/member")'), "Authenticated server-side login routing is not using scoped admin access.");
assert(loginForm.includes('router.replace(hasAdminAccess ? "/admin" : "/member")'), "Client-side password/passkey login routing is not using scoped admin access.");

assert(adminLayout.includes("context.user.member") && adminLayout.includes('href="/member"') && adminLayout.includes("Member Dashboard"), "Administrators who are members must have a visible Member Dashboard switch from the admin portal.");
assert(memberPage.includes("hasAdminAccess") && memberPage.includes('href="/admin"') && memberPage.includes("Admin Dashboard"), "Members with administrator permissions must have a visible Admin Dashboard switch from the member portal.");
assert(memberPage.includes('if (!context.user.member) redirect("/admin")'), "Users without a member profile must remain excluded from the member dashboard.");

console.log("Admin/member dual-dashboard routing contract passed for National and chapter-scoped administrators.");
