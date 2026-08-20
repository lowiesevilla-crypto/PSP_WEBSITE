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

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  }

  const existingAssignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: user.id,
      roleId: role.id,
      chapterId: null,
      endsAt: null,
    },
  });

  if (!existingAssignment) {
    await prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        chapterId: null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "SYSTEM_ADMIN_BOOTSTRAPPED",
      entityType: "User",
      entityId: user.id,
      metadataJson: { source: "CLI_BOOTSTRAP" },
    },
  });

  console.log(`System Administrator is ready for ${email}.`);
  console.log("Remove bootstrap password variables from the runtime environment after successful setup.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
