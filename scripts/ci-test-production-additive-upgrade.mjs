import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hasColumn(tableName, columnName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${tableName}' AND column_name = '${columnName}' LIMIT 1`,
  );
  return rows.length > 0;
}

async function hasIndex(tableName, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS present FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${tableName}' AND index_name = '${indexName}' LIMIT 1`,
  );
  return rows.length > 0;
}

async function dropIndexIfPresent(tableName, indexName) {
  if (await hasIndex(tableName, indexName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
  }
}

async function dropColumnIfPresent(tableName, columnName) {
  if (await hasColumn(tableName, columnName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
  }
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  console.log("Preparing CI legacy member-mobile schema for production additive-upgrade regression...");

  await dropIndexIfPresent("Certificate", "Certificate_batchId_memberId_key");
  await dropIndexIfPresent("Certificate", "Certificate_certificateType_certificateDate_idx");
  await dropIndexIfPresent("Announcement", "Announcement_isPublic_startsAt_idx");

  for (const columnName of [
    "batchId",
    "referenceLabel",
    "certificateDate",
    "citationText",
    "title",
    "certificateType",
  ]) {
    await dropColumnIfPresent("Certificate", columnName);
  }
  await dropColumnIfPresent("Announcement", "isPublic");
} finally {
  await prisma.$disconnect();
}

const productionEnv = { ...process.env, APP_ENV: "production" };
run(process.execPath, [path.join(process.cwd(), "scripts", "production-build-init.mjs")], productionEnv);

const verify = new PrismaClient();
try {
  for (const [tableName, columnName] of [
    ["Certificate", "certificateType"],
    ["Certificate", "title"],
    ["Certificate", "citationText"],
    ["Certificate", "certificateDate"],
    ["Certificate", "referenceLabel"],
    ["Certificate", "batchId"],
    ["Announcement", "isPublic"],
  ]) {
    const rows = await verify.$queryRawUnsafe(
      `SELECT 1 AS present FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${tableName}' AND column_name = '${columnName}' LIMIT 1`,
    );
    if (rows.length !== 1) {
      throw new Error(`Production additive upgrade did not create ${tableName}.${columnName}.`);
    }
  }

  for (const [tableName, indexName] of [
    ["Certificate", "Certificate_batchId_memberId_key"],
    ["Certificate", "Certificate_certificateType_certificateDate_idx"],
    ["Announcement", "Announcement_isPublic_startsAt_idx"],
  ]) {
    const rows = await verify.$queryRawUnsafe(
      `SELECT 1 AS present FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${tableName}' AND index_name = '${indexName}' LIMIT 1`,
    );
    if (rows.length === 0) {
      throw new Error(`Production additive upgrade did not create ${indexName}.`);
    }
  }
} finally {
  await verify.$disconnect();
}

// Final contract: Prisma must see the safely upgraded database as fully synchronized
// without requiring --accept-data-loss.
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
run(process.execPath, [prismaCli, "db", "push", "--skip-generate"], process.env);

console.log("Production additive schema upgrade regression passed.");
