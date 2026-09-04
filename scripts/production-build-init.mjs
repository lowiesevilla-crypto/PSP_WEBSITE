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
const MEMBER_MOBILE_TABLES = [
  "PasskeyCredential",
  "DigitalMemberId",
  "ChapterPaymentConfig",
];
const MEMBER_MOBILE_COLUMNS = [
  ["Payment", "category"],
  ["Payment", "description"],
  ["Certificate", "signatoryName"],
  ["Certificate", "signatoryTitle"],
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

function runPrismaPush() {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  // Intentionally do not pass --accept-data-loss. Prisma must refuse any destructive change.
  runNode(prismaCli, ["db", "push", "--skip-generate"]);
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
let columnKeys;

try {
  const [tables, columns] = await Promise.all([
    prisma.$queryRawUnsafe(
      "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
    ),
    prisma.$queryRawUnsafe(
      "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE()",
    ),
  ]);

  tableNames = new Set(
    tables
      .map((row) => row?.tableName ?? row?.TABLE_NAME)
      .filter((value) => typeof value === "string"),
  );
  columnKeys = new Set(
    columns
      .map((row) => {
        const tableName = row?.tableName ?? row?.TABLE_NAME;
        const columnName = row?.columnName ?? row?.COLUMN_NAME;
        return typeof tableName === "string" && typeof columnName === "string"
          ? `${tableName}.${columnName}`
          : null;
      })
      .filter(Boolean),
  );
} finally {
  await prisma.$disconnect();
}

const presentRequired = REQUIRED_PSP_TABLES.filter((name) => tableNames.has(name));
const presentFeatureTables = MEMBER_MOBILE_TABLES.filter((name) => tableNames.has(name));
const presentFeatureColumns = MEMBER_MOBILE_COLUMNS.filter(([table, column]) =>
  columnKeys.has(`${table}.${column}`),
);
const featureItemCount = MEMBER_MOBILE_TABLES.length + MEMBER_MOBILE_COLUMNS.length;
const presentFeatureItemCount = presentFeatureTables.length + presentFeatureColumns.length;

if (tableNames.size === 0) {
  console.log("Empty dedicated PSP database detected; applying the initial greenfield Prisma schema.");
  runPrismaPush();
} else if (presentRequired.length !== REQUIRED_PSP_TABLES.length) {
  console.error(
    `Production database is not empty but does not contain the complete PSP baseline tables (${presentRequired.length}/${REQUIRED_PSP_TABLES.length}). Refusing automatic schema push.`,
  );
  console.error(
    "Verify that DATABASE_URL points to the dedicated PSP database and use a reviewed migration/recovery procedure for any partial or existing schema.",
  );
  process.exit(1);
} else if (presentFeatureItemCount === 0) {
  console.log(
    "Recognized pre-member-mobile PSP schema detected; applying the reviewed additive member-mobile schema sync.",
  );
  runPrismaPush();
} else if (presentFeatureItemCount !== featureItemCount) {
  console.error(
    `Partial member-mobile schema detected (${presentFeatureItemCount}/${featureItemCount}). Refusing automatic schema sync.`,
  );
  console.error(
    "Use the reviewed recovery procedure before continuing so production cannot drift into a partially upgraded state.",
  );
  process.exit(1);
} else {
  console.log("Existing current PSP schema detected; automatic schema push skipped.");
}

console.log("Running idempotent PSP production baseline and configured administrator synchronization...");
runNode(path.join(process.cwd(), "scripts", "production-init.mjs"));
runNode(path.join(process.cwd(), "scripts", "backfill-digital-ids.mjs"));
console.log("PSP production build initialization complete.");
