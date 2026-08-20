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

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "PSP System Administrator";

  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required. Never commit these values.",
    );
  }

  const role = await prisma.role.findUnique({ where: { code: "SYSTEM_ADMIN" } });
  if (!role) {
    throw new Error("SYSTEM_ADMIN role is missing. Run `npm run seed` first.");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
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

    const existingAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        userId: synchronizedUser.id,
        roleId: role.id,
        chapterId: null,
        endsAt: null,
      },
    });

    if (!existingAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          userId: synchronizedUser.id,
          roleId: role.id,
          chapterId: null,
        },
      });
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
        },
      },
    });

    return synchronizedUser;
  });

  console.log(`System Administrator is ready for ${user.email}.`);
  console.log(
    "IMPORTANT: Remove BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, and BOOTSTRAP_ADMIN_NAME from the runtime environment after successful first login.",
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
