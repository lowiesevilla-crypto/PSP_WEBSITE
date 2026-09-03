import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function run(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function ensureProductionBaseline() {
  const prisma = new PrismaClient();

  try {
    let organization = await prisma.organization.findUnique({
      where: { code: "PSP_PH" },
      select: { id: true },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          code: "PSP_PH",
          name: "Psi Sigma Phi Philippines Inc.",
        },
        select: { id: true },
      });
      console.log("Created PSP national organization baseline.");
    }

    const rhoAlpha = await prisma.chapters.findUnique({
      where: { code: "RHO_ALPHA_DLP" },
      select: { id: true },
    });

    if (!rhoAlpha) {
      await prisma.chapters.create({
        data: {
          organizationId: organization.id,
          code: "RHO_ALPHA_DLP",
          name: "Rho Alpha De Las Piñas",
          status: "ACTIVE",
        },
      });
      console.log("Created Rho Alpha De Las Piñas chapter baseline.");
    }

    const systemAdminRole = await prisma.role.findUnique({
      where: { code: "SYSTEM_ADMIN" },
      select: { id: true },
    });

    return Boolean(systemAdminRole);
  } finally {
    await prisma.$disconnect();
  }
}

console.log("Checking PSP production baseline...");
const baselineReady = await ensureProductionBaseline();

if (!baselineReady) {
  console.log("System role baseline is missing; running one-time PSP seed initialization.");
  run("prisma/seed.mjs");
} else {
  console.log("PSP baseline already exists; full seed skipped.");
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const optionalBootstrapValues = [
  process.env.BOOTSTRAP_ADMIN_NAME,
  process.env.BOOTSTRAP_ADMIN_MEMBER_NO,
  process.env.BOOTSTRAP_ADMIN_CHAPTER_CODE,
  process.env.BOOTSTRAP_ADMIN_FIRST_NAME,
  process.env.BOOTSTRAP_ADMIN_LAST_NAME,
].map((value) => value?.trim()).filter(Boolean);

if ((email && !password) || (!email && password)) {
  console.error(
    "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must either both be configured or both be removed.",
  );
  process.exit(1);
}

if (email && password) {
  console.log(`Synchronizing configured PSP System Administrator: ${email.toLowerCase()}`);
  run("scripts/bootstrap-admin.mjs");
  console.log(
    "Bootstrap administrator synchronized. Keep BOOTSTRAP_ADMIN_* until a successful production /admin login is verified; remove all BOOTSTRAP_ADMIN_* only after that verification.",
  );
} else {
  if (optionalBootstrapValues.length > 0) {
    console.warn(
      "BOOTSTRAP_ADMIN_* metadata is configured without bootstrap email/password; administrator synchronization was skipped.",
    );
  }
  console.log("No bootstrap administrator credentials configured; continuing normally.");
}
