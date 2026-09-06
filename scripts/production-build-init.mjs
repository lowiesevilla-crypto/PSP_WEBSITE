import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const PRODUCTION_ENV = "production";
const REQUIRED_PSP_TABLES = ["Organization", "Chapters", "Role", "User", "AuditLog"];
const MEMBER_MOBILE_TABLES = ["PasskeyCredential", "DigitalMemberId", "ChapterPaymentConfig"];
const MEMBER_MOBILE_COLUMNS = [
  ["Payment", "category"],
  ["Payment", "description"],
  ["Certificate", "signatoryName"],
  ["Certificate", "signatoryTitle"],
];
const CUSTOM_CERTIFICATE_COLUMNS = [
  ["Certificate", "certificateType"],
  ["Certificate", "title"],
  ["Certificate", "citationText"],
  ["Certificate", "certificateDate"],
  ["Certificate", "referenceLabel"],
  ["Certificate", "batchId"],
];
const PUBLIC_ANNOUNCEMENT_COLUMNS = [["Announcement", "isPublic"]];

function runNode(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runPrismaPush() {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  // Intentionally do not pass --accept-data-loss. Prisma must refuse any destructive change.
  runNode(prismaCli, ["db", "push", "--skip-generate"]);
}

function getColumnValue(row, camel, upper) {
  return row?.[camel] ?? row?.[upper];
}

async function loadIndexSignatures(prisma, tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS seqInIndex, COLUMN_NAME AS columnName
       FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = '${tableName}'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
  );

  const indexes = new Map();
  for (const row of rows) {
    const indexName = getColumnValue(row, "indexName", "INDEX_NAME");
    const columnName = getColumnValue(row, "columnName", "COLUMN_NAME");
    const nonUnique = Number(getColumnValue(row, "nonUnique", "NON_UNIQUE"));
    if (typeof indexName !== "string" || typeof columnName !== "string") continue;
    const current = indexes.get(indexName) ?? { columns: [], unique: nonUnique === 0 };
    current.columns.push(columnName);
    indexes.set(indexName, current);
  }
  return indexes;
}

function hasIndex(indexes, columns, unique) {
  return [...indexes.values()].some(
    (index) => index.unique === unique && index.columns.join("\u0000") === columns.join("\u0000"),
  );
}

async function applySafeCustomCertificateUpgrade(columnKeys) {
  const prisma = new PrismaClient();
  try {
    console.log("Applying reviewed additive custom-certificate schema upgrade without destructive Prisma push.");

    if (!columnKeys.has("Certificate.certificateType")) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `Certificate` ADD COLUMN `certificateType` VARCHAR(191) NOT NULL DEFAULT 'MEMBERSHIP'",
      );
    }
    if (!columnKeys.has("Certificate.title")) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `Certificate` ADD COLUMN `title` VARCHAR(191) NOT NULL DEFAULT 'Certificate of Membership'",
      );
    }
    if (!columnKeys.has("Certificate.citationText")) {
      await prisma.$executeRawUnsafe("ALTER TABLE `Certificate` ADD COLUMN `citationText` TEXT NULL");
    }
    if (!columnKeys.has("Certificate.certificateDate")) {
      // Backfill existing certificates from their immutable issuance timestamp before enforcing NOT NULL.
      await prisma.$executeRawUnsafe("ALTER TABLE `Certificate` ADD COLUMN `certificateDate` DATETIME(3) NULL");
      await prisma.$executeRawUnsafe(
        "UPDATE `Certificate` SET `certificateDate` = `issuedAt` WHERE `certificateDate` IS NULL",
      );
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `Certificate` MODIFY COLUMN `certificateDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      );
    }
    if (!columnKeys.has("Certificate.referenceLabel")) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `Certificate` ADD COLUMN `referenceLabel` VARCHAR(191) NULL",
      );
    }
    if (!columnKeys.has("Certificate.batchId")) {
      await prisma.$executeRawUnsafe("ALTER TABLE `Certificate` ADD COLUMN `batchId` VARCHAR(191) NULL");
    }

    const duplicateBatchRows = await prisma.$queryRawUnsafe(
      "SELECT `batchId`, `memberId`, COUNT(*) AS duplicateCount FROM `Certificate` WHERE `batchId` IS NOT NULL GROUP BY `batchId`, `memberId` HAVING COUNT(*) > 1 LIMIT 1",
    );
    if (duplicateBatchRows.length > 0) {
      console.error(
        "Duplicate non-null Certificate(batchId, memberId) values exist. Refusing to create the r14 uniqueness constraint automatically.",
      );
      console.error("Resolve the duplicate certificate batch records with a reviewed recovery procedure before redeploying.");
      process.exit(1);
    }

    const certificateIndexes = await loadIndexSignatures(prisma, "Certificate");
    if (!hasIndex(certificateIndexes, ["batchId", "memberId"], true)) {
      await prisma.$executeRawUnsafe(
        "CREATE UNIQUE INDEX `Certificate_batchId_memberId_key` ON `Certificate` (`batchId`, `memberId`)",
      );
    }
    if (!hasIndex(certificateIndexes, ["certificateType", "certificateDate"], false)) {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX `Certificate_certificateType_certificateDate_idx` ON `Certificate` (`certificateType`, `certificateDate`)",
      );
    }

    console.log("Custom-certificate additive schema upgrade complete.");
  } finally {
    await prisma.$disconnect();
  }
}

async function applySafePublicAnnouncementUpgrade(columnKeys) {
  const prisma = new PrismaClient();
  try {
    console.log("Applying reviewed additive public-announcement visibility schema upgrade.");
    if (!columnKeys.has("Announcement.isPublic")) {
      // Existing/member-only announcements must remain private after the additive upgrade.
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `Announcement` ADD COLUMN `isPublic` TINYINT(1) NOT NULL DEFAULT 0",
      );
    }

    const announcementIndexes = await loadIndexSignatures(prisma, "Announcement");
    if (!hasIndex(announcementIndexes, ["isPublic", "startsAt"], false)) {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX `Announcement_isPublic_startsAt_idx` ON `Announcement` (`isPublic`, `startsAt`)",
      );
    }
    console.log("Public-announcement additive schema upgrade complete.");
  } finally {
    await prisma.$disconnect();
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
const presentCustomCertificateColumns = CUSTOM_CERTIFICATE_COLUMNS.filter(([table, column]) =>
  columnKeys.has(`${table}.${column}`),
);
const presentPublicAnnouncementColumns = PUBLIC_ANNOUNCEMENT_COLUMNS.filter(([table, column]) =>
  columnKeys.has(`${table}.${column}`),
);

let schemaPushPerformed = false;

if (tableNames.size === 0) {
  console.log("Empty dedicated PSP database detected; applying the initial greenfield Prisma schema.");
  runPrismaPush();
  schemaPushPerformed = true;
} else if (presentRequired.length !== REQUIRED_PSP_TABLES.length) {
  console.error(
    `Production database is not empty but does not contain the complete PSP baseline tables (${presentRequired.length}/${REQUIRED_PSP_TABLES.length}). Refusing automatic schema push.`,
  );
  console.error(
    "Verify that DATABASE_URL points to the dedicated PSP database and use a reviewed migration/recovery procedure for any partial or existing schema.",
  );
  process.exit(1);
} else if (presentFeatureItemCount === 0) {
  console.log("Recognized pre-member-mobile PSP schema detected; applying the reviewed additive member-mobile schema sync.");
  runPrismaPush();
  schemaPushPerformed = true;
} else if (presentFeatureItemCount !== featureItemCount) {
  console.error(
    `Partial member-mobile schema detected (${presentFeatureItemCount}/${featureItemCount}). Refusing automatic schema sync.`,
  );
  console.error(
    "Use the reviewed recovery procedure before continuing so production cannot drift into a partially upgraded state.",
  );
  process.exit(1);
} else {
  console.log("Existing member-mobile PSP schema detected.");
}

if (!schemaPushPerformed) {
  if (presentCustomCertificateColumns.length === CUSTOM_CERTIFICATE_COLUMNS.length) {
    console.log("Existing current PSP custom-certificate schema detected.");
  } else {
    await applySafeCustomCertificateUpgrade(columnKeys);
  }

  if (presentPublicAnnouncementColumns.length === PUBLIC_ANNOUNCEMENT_COLUMNS.length) {
    console.log("Existing current PSP public-announcement visibility schema detected.");
  } else {
    await applySafePublicAnnouncementUpgrade(columnKeys);
  }
}

console.log("Running idempotent PSP production baseline and member-mobile synchronization...");
runNode(path.join(process.cwd(), "scripts", "production-init.mjs"));
runNode(path.join(process.cwd(), "scripts", "sync-member-mobile-rbac.mjs"));
runNode(path.join(process.cwd(), "scripts", "backfill-digital-ids.mjs"));
console.log("PSP production build initialization complete.");
