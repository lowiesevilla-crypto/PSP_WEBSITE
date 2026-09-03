import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  if (password.length < 10 || password.length > 128) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be between 10 and 128 characters.");
  }

  const salt = randomBytes(16);
  const N = 32768;
  const r = 8;
  const p = 1;
  const derived = await scrypt(password, salt, 64, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    "scrypt-v1",
    N,
    r,
    p,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

function memberIdentity(displayName) {
  const membershipNo = process.env.BOOTSTRAP_ADMIN_MEMBER_NO?.trim();
  const chapterCode = process.env.BOOTSTRAP_ADMIN_CHAPTER_CODE?.trim();
  const explicitFirstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME?.trim();
  const explicitLastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME?.trim();
  const configured = [membershipNo, chapterCode, explicitFirstName, explicitLastName].some(Boolean);

  if (!configured) return null;
  if (!membershipNo || !chapterCode) {
    throw new Error(
      "BOOTSTRAP_ADMIN_MEMBER_NO and BOOTSTRAP_ADMIN_CHAPTER_CODE are both required when bootstrapping a member identity.",
    );
  }

  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = explicitFirstName || nameParts[0];
  const lastName = explicitLastName || nameParts.slice(1).join(" ");
  if (!firstName || !lastName) {
    throw new Error(
      "Bootstrap member identity requires first and last name. Configure BOOTSTRAP_ADMIN_FIRST_NAME and BOOTSTRAP_ADMIN_LAST_NAME when BOOTSTRAP_ADMIN_NAME cannot be split safely.",
    );
  }

  return { membershipNo, chapterCode, firstName, lastName };
}

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "PSP System Administrator";

  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required. Never commit these values.",
    );
  }

  const identity = memberIdentity(displayName);
  const [systemAdminRole, memberRole, chapter] = await Promise.all([
    prisma.role.findUnique({ where: { code: "SYSTEM_ADMIN" } }),
    identity ? prisma.role.findUnique({ where: { code: "MEMBER" } }) : Promise.resolve(null),
    identity ? prisma.chapters.findUnique({ where: { code: identity.chapterCode } }) : Promise.resolve(null),
  ]);

  if (!systemAdminRole) {
    throw new Error("SYSTEM_ADMIN role is missing. Run `npm run seed` first.");
  }
  if (identity && !memberRole) {
    throw new Error("MEMBER role is missing. Run `npm run seed` first.");
  }
  if (identity && !chapter) {
    throw new Error(`Bootstrap chapter ${identity.chapterCode} does not exist.`);
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const synchronizedUser = await tx.user.upsert({
      where: { email },
      create: {
        email,
        displayName,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: now,
      },
      update: {
        displayName,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: now,
      },
    });

    const existingSystemAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        userId: synchronizedUser.id,
        roleId: systemAdminRole.id,
        chapterId: null,
        endsAt: null,
      },
    });

    if (!existingSystemAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          userId: synchronizedUser.id,
          roleId: systemAdminRole.id,
          chapterId: null,
        },
      });
    }

    let synchronizedMember = null;
    if (identity && memberRole && chapter) {
      const numberOwner = await tx.member.findUnique({
        where: { membershipNo: identity.membershipNo },
        select: { id: true, userId: true },
      });
      if (numberOwner && numberOwner.userId !== synchronizedUser.id) {
        throw new Error("BOOTSTRAP_ADMIN_MEMBER_NO is already assigned to another user.");
      }

      const existingMember = await tx.member.findUnique({
        where: { userId: synchronizedUser.id },
        select: { id: true, chapterId: true, membershipStatus: true },
      });

      if (existingMember) {
        const appendHistory =
          existingMember.chapterId !== chapter.id || existingMember.membershipStatus !== "ACTIVE";

        synchronizedMember = await tx.member.update({
          where: { id: existingMember.id },
          data: {
            chapterId: chapter.id,
            membershipNo: identity.membershipNo,
            firstName: identity.firstName,
            lastName: identity.lastName,
            membershipStatus: "ACTIVE",
          },
        });

        if (appendHistory) {
          await tx.membershipHistory.updateMany({
            where: { memberId: existingMember.id, effectiveTo: null },
            data: { effectiveTo: now },
          });
          await tx.membershipHistory.create({
            data: {
              memberId: existingMember.id,
              chapterId: chapter.id,
              status: "ACTIVE",
              effectiveFrom: now,
              reason: "System Administrator bootstrap identity synchronization",
            },
          });
        }
      } else {
        synchronizedMember = await tx.member.create({
          data: {
            userId: synchronizedUser.id,
            chapterId: chapter.id,
            membershipNo: identity.membershipNo,
            firstName: identity.firstName,
            lastName: identity.lastName,
            membershipStatus: "ACTIVE",
            joinedAt: now,
          },
        });
        await tx.membershipHistory.create({
          data: {
            memberId: synchronizedMember.id,
            chapterId: chapter.id,
            status: "ACTIVE",
            effectiveFrom: now,
            reason: "System Administrator bootstrap identity creation",
          },
        });
      }

      const existingMemberAssignment = await tx.userRoleAssignment.findFirst({
        where: {
          userId: synchronizedUser.id,
          roleId: memberRole.id,
          chapterId: chapter.id,
          endsAt: null,
        },
      });
      if (!existingMemberAssignment) {
        await tx.userRoleAssignment.create({
          data: {
            userId: synchronizedUser.id,
            roleId: memberRole.id,
            chapterId: chapter.id,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: synchronizedUser.id,
        action: "SYSTEM_ADMIN_BOOTSTRAPPED",
        entityType: "User",
        entityId: synchronizedUser.id,
        metadataJson: {
          source: "CLI_BOOTSTRAP",
          credentialsSynchronized: true,
          memberIdentitySynchronized: Boolean(synchronizedMember),
        },
      },
    });

    return { user: synchronizedUser, member: synchronizedMember };
  });

  console.log(`System Administrator is ready for ${result.user.email}.`);
  if (result.member) {
    console.log("Configured PSP member identity is linked to the System Administrator.");
  }
  console.log(
    "IMPORTANT: Keep BOOTSTRAP_ADMIN_* configured until a successful production /admin login is verified, then remove all BOOTSTRAP_ADMIN_* runtime variables.",
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
