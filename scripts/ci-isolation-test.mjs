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

  const foreignMedia = await request("/api/community/media/ci-beta-image", cookie);
  assert(foreignMedia.status === 403, `Expected cross-chapter protected media 403, received ${foreignMedia.status}.`);

  const foreignFinance = await request("/api/admin/finance/rates", cookie, {
    method: "POST",
    body: JSON.stringify({
      chapterId: "ci-chapter-beta",
      assessmentTypeCode: "MONTHLY_DUES",
      amount: 500,
      effectiveFrom: "2026-09-01T00:00:00.000Z",
    }),
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
    }),
  });
  assert(foreignAnnouncement.status === 403, `Expected cross-chapter announcement mutation 403, received ${foreignAnnouncement.status}.`);

  console.log("Cross-chapter isolation suite passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
