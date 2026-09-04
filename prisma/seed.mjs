import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  ["chapters.view", "View Chapters"],
  ["chapters.manage", "Manage Chapters"],
  ["applications.view", "View Membership Applications"],
  ["applications.review", "Review Membership Applications"],
  ["members.view", "View Members"],
  ["members.manage", "Manage Members"],
  ["roles.manage", "Manage Roles and Access"],
  ["finance.view", "View Chapter Finance"],
  ["finance.manage", "Manage Chapter Finance"],
  ["content.manage", "Manage Community Content"],
  ["events.manage", "Manage Events"],
  ["reports.view", "View Reports"],
  ["audit.view", "View Audit Logs"],
  ["certificates.manage", "Manage Certificates"],
  ["profile.self", "Manage Own Profile"],
  ["community.use", "Use Member Community"],
];

const roleDefinitions = [
  {
    code: "SYSTEM_ADMIN",
    name: "System Administrator",
    isSystem: true,
    permissions: permissions.map(([code]) => code),
  },
  {
    code: "CHAPTER_ADMIN",
    name: "Chapter Administrator",
    isSystem: true,
    permissions: [
      "chapters.view",
      "applications.view",
      "applications.review",
      "members.view",
      "members.manage",
      "finance.view",
      "finance.manage",
      "content.manage",
      "events.manage",
      "reports.view",
      "certificates.manage",
    ],
  },
  {
    code: "CHAPTER_TREASURER",
    name: "Chapter Treasurer / Finance",
    isSystem: true,
    permissions: ["chapters.view", "members.view", "finance.view", "finance.manage", "reports.view"],
  },
  {
    code: "CHAPTER_OFFICER",
    name: "Chapter Officer",
    isSystem: true,
    permissions: ["chapters.view", "members.view", "content.manage", "events.manage"],
  },
  {
    code: "MEMBER",
    name: "Member",
    isSystem: true,
    permissions: ["chapters.view", "profile.self", "community.use"],
  },
];

const assessmentTypes = [
  ["MONTHLY_DUES", "Monthly Chapter Dues"],
  ["NATIONAL_DUES", "National Dues"],
  ["SPECIAL_ASSESSMENT", "Special Assessment"],
  ["EVENT_CONTRIBUTION", "Event Contribution"],
  ["MEMBERSHIP_FEE", "Membership Fee"],
  ["DONATION", "Donation"],
  ["OTHER", "Other Collection"],
];

async function main() {
  const organization = await prisma.organization.upsert({
    where: { code: "PSP_PH" },
    update: { name: "Psi Sigma Phi Philippines Inc." },
    create: { code: "PSP_PH", name: "Psi Sigma Phi Philippines Inc." },
  });

  await prisma.chapters.upsert({
    where: { code: "RHO_ALPHA_DLP" },
    update: {
      organizationId: organization.id,
      name: "Rho Alpha De Las Piñas",
      status: "ACTIVE",
    },
    create: {
      organizationId: organization.id,
      code: "RHO_ALPHA_DLP",
      name: "Rho Alpha De Las Piñas",
      status: "ACTIVE",
    },
  });

  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: definition.code },
      update: { name: definition.name, isSystem: definition.isSystem },
      create: {
        code: definition.code,
        name: definition.name,
        isSystem: definition.isSystem,
      },
    });

    const rolePermissions = await prisma.permission.findMany({
      where: { code: { in: definition.permissions } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (rolePermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  for (const [code, name] of assessmentTypes) {
    await prisma.assessmentType.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  console.log("PSP baseline data seeded, including Rho Alpha De Las Piñas.");
}

main()
  .catch((error) => {
    console.error("PSP seed failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
