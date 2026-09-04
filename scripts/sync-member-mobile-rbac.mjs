import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({ where: { code: "CHAPTER_ADMIN" } });
  if (!role) {
    console.log("CHAPTER_ADMIN role is not present; member-mobile RBAC sync skipped.");
    return;
  }

  const requiredCodes = ["finance.view", "finance.manage"];
  const permissions = await prisma.permission.findMany({
    where: { code: { in: requiredCodes } },
    select: { id: true, code: true },
  });
  if (permissions.length !== requiredCodes.length) {
    throw new Error("Required chapter finance permissions are not initialized.");
  }

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  console.log("Member-mobile RBAC synchronized: Chapter Administrators can manage chapter finance and linked PayMongo setup.");
}

main()
  .catch((error) => {
    console.error("Member-mobile RBAC synchronization failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
