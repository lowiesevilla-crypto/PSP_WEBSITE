import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD = "CI-Chapter-Admin-Password-2026!";

function scryptPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derived) => {
        if (error) return reject(error);
        resolve([
          "scrypt-v1",
          32768,
          8,
          1,
          salt.toString("base64url"),
          Buffer.from(derived).toString("base64url"),
        ].join("$"));
      },
    );
  });
}

async function main() {
  const organization = await prisma.organization.findUnique({ where: { code: "PSP_PH" } });
  const [chapterAdminRole, memberRole] = await Promise.all([
    prisma.role.findUnique({ where: { code: "CHAPTER_ADMIN" } }),
    prisma.role.findUnique({ where: { code: "MEMBER" } }),
  ]);
  if (!organization || !chapterAdminRole || !memberRole) {
    throw new Error("Baseline seed must run before isolation fixtures.");
  }

  const [chapterA, chapterB] = await Promise.all([
    prisma.chapters.upsert({
      where: { code: "CI_ALPHA" },
      update: { name: "CI Alpha Chapter", status: "ACTIVE" },
      create: { id: "ci-chapter-alpha", organizationId: organization.id, code: "CI_ALPHA", name: "CI Alpha Chapter", status: "ACTIVE" },
    }),
    prisma.chapters.upsert({
      where: { code: "CI_BETA" },
      update: { name: "CI Beta Chapter", status: "ACTIVE" },
      create: { id: "ci-chapter-beta", organizationId: organization.id, code: "CI_BETA", name: "CI Beta Chapter", status: "ACTIVE" },
    }),
  ]);

  const passwordHash = await scryptPassword(PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: "ci-alpha-admin@example.invalid" },
    update: { displayName: "CI Alpha Chapter Admin", status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash },
    create: { id: "ci-alpha-admin-user", email: "ci-alpha-admin@example.invalid", displayName: "CI Alpha Chapter Admin", status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash },
  });

  await prisma.userRoleAssignment.deleteMany({ where: { userId: admin.id } });
  await prisma.userRoleAssignment.create({
    data: { userId: admin.id, roleId: chapterAdminRole.id, chapterId: chapterA.id },
  });

  for (const fixture of [
    {
      userId: "ci-alpha-member-user",
      memberId: "ci-alpha-member",
      email: "ci-alpha-member@example.invalid",
      displayName: "CI Alpha Member",
      chapterId: chapterA.id,
      membershipNo: "CI-ALPHA-MEMBER-001",
      digitalId: "ci-alpha-digital-id",
      verificationToken: "ci-alpha-member-verification-token",
    },
    {
      userId: "ci-beta-member-user",
      memberId: "ci-beta-member",
      email: "ci-beta-member@example.invalid",
      displayName: "CI Beta Member",
      chapterId: chapterB.id,
      membershipNo: "CI-BETA-MEMBER-001",
      digitalId: "ci-beta-digital-id",
      verificationToken: "ci-beta-member-verification-token",
    },
  ]) {
    const user = await prisma.user.upsert({
      where: { email: fixture.email },
      update: {
        displayName: fixture.displayName,
        status: "INVITED",
        emailVerifiedAt: null,
        passwordHash: null,
      },
      create: {
        id: fixture.userId,
        email: fixture.email,
        displayName: fixture.displayName,
        status: "INVITED",
      },
    });

    const member = await prisma.member.upsert({
      where: { userId: user.id },
      update: {
        chapterId: fixture.chapterId,
        membershipNo: fixture.membershipNo,
        firstName: fixture.displayName.includes("Alpha") ? "Alpha" : "Beta",
        lastName: "Member",
        membershipStatus: "ACTIVE",
      },
      create: {
        id: fixture.memberId,
        userId: user.id,
        chapterId: fixture.chapterId,
        membershipNo: fixture.membershipNo,
        firstName: fixture.displayName.includes("Alpha") ? "Alpha" : "Beta",
        lastName: "Member",
        membershipStatus: "ACTIVE",
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
    await prisma.userRoleAssignment.create({
      data: { userId: user.id, roleId: memberRole.id, chapterId: fixture.chapterId },
    });

    await prisma.membershipHistory.deleteMany({ where: { memberId: member.id } });
    await prisma.membershipHistory.create({
      data: {
        memberId: member.id,
        chapterId: fixture.chapterId,
        status: "ACTIVE",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        reason: "CI member administration fixture",
      },
    });

    await prisma.digitalMemberId.upsert({
      where: { memberId: member.id },
      update: {
        status: "VALID",
        revokedAt: null,
        verificationToken: fixture.verificationToken,
      },
      create: {
        id: fixture.digitalId,
        memberId: member.id,
        verificationToken: fixture.verificationToken,
        status: "VALID",
      },
    });
  }

  await prisma.membershipApplication.deleteMany({ where: { id: { in: ["ci-alpha-application", "ci-beta-application"] } } });
  await prisma.membershipApplication.createMany({
    data: [
      {
        id: "ci-alpha-application",
        chapterId: chapterA.id,
        firstName: "Alpha",
        lastName: "Applicant",
        address: "CI Alpha Address",
        email: "ci-alpha-applicant@example.invalid",
        mobile: "09000000001",
        dateSurvive: new Date("2026-01-01T00:00:00.000Z"),
        surviveLocation: "Alpha Location",
        pspBirthdayCode: "CI-ALPHA-001",
        birthDate: new Date("1990-01-01T00:00:00.000Z"),
        status: "SUBMITTED",
      },
      {
        id: "ci-beta-application",
        chapterId: chapterB.id,
        firstName: "Beta",
        lastName: "Applicant",
        address: "CI Beta Address",
        email: "ci-beta-applicant@example.invalid",
        mobile: "09000000002",
        dateSurvive: new Date("2026-01-02T00:00:00.000Z"),
        surviveLocation: "Beta Location",
        pspBirthdayCode: "CI-BETA-001",
        birthDate: new Date("1991-01-01T00:00:00.000Z"),
        status: "SUBMITTED",
      },
    ],
  });

  await prisma.postImage.deleteMany({ where: { id: "ci-beta-image" } });
  await prisma.post.deleteMany({ where: { id: "ci-beta-post" } });
  await prisma.post.create({
    data: {
      id: "ci-beta-post",
      authorUserId: admin.id,
      chapterId: chapterB.id,
      audience: "CHAPTER",
      body: "CI protected Beta chapter content",
    },
  });
  await prisma.postImage.create({
    data: {
      id: "ci-beta-image",
      postId: "ci-beta-post",
      storageKey: "ci-fixtures/nonexistent.jpg",
      url: "/api/community/media/ci-beta-image",
      mimeType: "image/jpeg",
      sizeBytes: 3,
    },
  });

  console.log(JSON.stringify({
    email: admin.email,
    password: PASSWORD,
    chapterA: chapterA.id,
    chapterB: chapterB.id,
    applicationA: "ci-alpha-application",
    applicationB: "ci-beta-application",
    memberA: "ci-alpha-member",
    memberB: "ci-beta-member",
    imageB: "ci-beta-image",
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
