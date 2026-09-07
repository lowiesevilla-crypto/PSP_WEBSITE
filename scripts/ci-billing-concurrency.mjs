import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";
const CANONICAL_ORIGIN = "https://psp.hoahub.tech";
const COOKIE_FILE = process.env.CI_ADMIN_COOKIE_FILE || "/tmp/psp-admin.cookies";
const runToken = process.env.GITHUB_RUN_ID || String(Date.now());
const TITLE = `CI Concurrent National Dues ${runToken}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function adminCookie() {
  const raw = await readFile(COOKIE_FILE, "utf8");
  const cookies = raw
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((fields) => fields.length >= 7 && fields[5] && fields[6])
    .map((fields) => `${fields[5]}=${fields[6]}`);
  assert(cookies.length > 0, `No authenticated Admin cookie was found in ${COOKIE_FILE}.`);
  return cookies.join("; ");
}

async function cleanup() {
  const assessments = await prisma.assessment.findMany({ where: { title: TITLE }, select: { id: true } });
  const ids = assessments.map((item) => item.id);
  if (ids.length) {
    await prisma.memberLedgerEntry.deleteMany({ where: { assessmentId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { entityType: "Assessment", entityId: { in: ids } } });
    await prisma.assessment.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.notification.deleteMany({ where: { type: "PAYMENT", body: { contains: TITLE } } });
}

async function postNational(cookie) {
  return fetch(`${BASE_URL}/api/admin/finance/assessments`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: CANONICAL_ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      billingScope: "NATIONAL",
      assessmentTypeCode: "NATIONAL_DUES",
      title: TITLE,
      description: "CI overlapping-request regression for serializable National billing",
      amount: 1,
      coverageStart: "2026-10-01T00:00:00.000Z",
      coverageEnd: "2026-10-31T15:59:59.999Z",
      dueAt: "2026-10-31T15:59:59.999Z",
    }),
  });
}

async function main() {
  await cleanup();
  const cookie = await adminCookie();

  const activeChapters = await prisma.chapters.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  assert(activeChapters.length > 0, "Concurrency regression requires at least one active Chapter.");
  const chapterIds = activeChapters.map((chapter) => chapter.id);
  const activeMemberCount = await prisma.member.count({
    where: { chapterId: { in: chapterIds }, membershipStatus: "ACTIVE" },
  });

  const [first, second] = await Promise.all([postNational(cookie), postNational(cookie)]);
  const results = await Promise.all([first, second].map(async (response) => ({
    status: response.status,
    payload: await response.json().catch(() => ({})),
  })));
  const statuses = results.map((result) => result.status).sort((a, b) => a - b);
  assert(statuses.length === 2 && statuses[0] === 201 && statuses[1] === 409,
    `Concurrent equivalent National billing must produce one 201 and one 409, received ${JSON.stringify(results)}.`);

  const assessments = await prisma.assessment.findMany({
    where: { title: TITLE, status: { not: "CANCELLED" } },
    select: { id: true, chapterId: true },
  });
  assert(assessments.length === activeChapters.length,
    `Expected exactly one assessment per active Chapter (${activeChapters.length}), found ${assessments.length}.`);

  const chapterCounts = new Map();
  for (const assessment of assessments) {
    chapterCounts.set(assessment.chapterId, (chapterCounts.get(assessment.chapterId) || 0) + 1);
  }
  for (const chapterId of chapterIds) {
    assert(chapterCounts.get(chapterId) === 1, `Chapter ${chapterId} received duplicate/missing concurrent National assessment.`);
  }

  const assessmentIds = assessments.map((assessment) => assessment.id);
  const chargeCount = await prisma.memberLedgerEntry.count({
    where: { assessmentId: { in: assessmentIds }, type: "CHARGE" },
  });
  assert(chargeCount === activeMemberCount,
    `Expected one National charge per active member (${activeMemberCount}), found ${chargeCount}.`);

  console.log(JSON.stringify({
    status: "PASS",
    concurrentResponses: statuses,
    activeChapters: activeChapters.length,
    activeMembers: activeMemberCount,
    committedAssessments: assessments.length,
    committedCharges: chargeCount,
  }, null, 2));

  await cleanup();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
