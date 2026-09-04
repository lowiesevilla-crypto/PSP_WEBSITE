import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const PRODUCTION_ENV = "production";
const REQUIRED_PSP_TABLES = [
  "Organization",
  "Chapters",
  "Role",
  "User",
  "AuditLog",
];

function runNode(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if ((process.env.APP_ENV ?? "").trim().toLowerCase() !== PRODUCTION_ENV) {
  console.log("Production build initialization skipped outside APP_ENV=production.");
  process.exit(0);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL is required for production build initialization.");
  process.exit(1);
}

console.log("Checking PSP production database schema before build...");
const prisma = new PrismaClient();
let tableNames;

try {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
  );
  tableNames = new Set(
    rows
      .map((row) => row?.tableName ?? row?.TABLE_NAME)
      .filter((value) => typeof value === "string"),
  );
} finally {
  await prisma.$disconnect();
}

const presentRequired = REQUIRED_PSP_TABLES.filter((name) => tableNames.has(name));

if (tableNames.size === 0) {
  console.log("Empty dedicated PSP database detected; applying the initial greenfield Prisma schema.");
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  runNode(prismaCli, ["db", "push", "--skip-generate"]);
} else if (presentRequired.length !== REQUIRED_PSP_TABLES.length) {
  console.error(
    `Production database is not empty but does not contain the complete PSP baseline tables (${presentRequired.length}/${REQUIRED_PSP_TABLES.length}). Refusing automatic schema push.`,
  );
  console.error(
    "Verify that DATABASE_URL points to the dedicated PSP database and use a reviewed migration/recovery procedure for any partial or existing schema.",
  );
  process.exit(1);
} else {
  console.log("Existing PSP schema detected; automatic greenfield schema push skipped.");
}

console.log("Running idempotent PSP production baseline and configured administrator synchronization...");
runNode(path.join(process.cwd(), "scripts", "production-init.mjs"));
console.log("PSP production build initialization complete.");
