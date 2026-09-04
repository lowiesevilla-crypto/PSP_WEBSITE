import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PSP_RELEASE_ID } from "@/lib/release";

export const dynamic = "force-dynamic";

const SERVICE = "psi-sigma-phi-digital-platform";
const CANONICAL_PRODUCTION_ORIGIN = "https://psp.hoahub.tech";

function authConfigReady() {
  const secretReady = (process.env.AUTH_SECRET?.length ?? 0) >= 32;
  let appOriginReady = false;

  try {
    const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").origin;
    appOriginReady =
      process.env.APP_ENV === "production"
        ? origin === CANONICAL_PRODUCTION_ORIGIN
        : origin.startsWith("http://") || origin.startsWith("https://");
  } catch {
    appOriginReady = false;
  }

  return secretReady && appOriginReady;
}

function smtpConfigStatus() {
  const user = process.env.SMTP_USER?.trim() || process.env.SMTP_USERNAME?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM_ADDRESS?.trim();
  return process.env.SMTP_HOST?.trim() && user && process.env.SMTP_PASSWORD?.trim() && from
    ? "configured"
    : "not_configured";
}

function payMongoPlatformConfigStatus() {
  const secret = process.env.PAYMONGO_PLATFORM_SECRET_KEY?.trim();
  const accountId = process.env.PAYMONGO_PLATFORM_ACCOUNT_ID?.trim();
  const encryptionKey = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY?.trim();
  const bps = Number(process.env.PLATFORM_CONVENIENCE_FEE_BPS ?? 0);
  const fixedCentavos = Number(process.env.PLATFORM_CONVENIENCE_FEE_FIXED_CENTAVOS ?? 0);
  const feeConfigured =
    (Number.isFinite(bps) && bps > 0) ||
    (Number.isFinite(fixedCentavos) && fixedCentavos > 0);

  return secret && accountId?.startsWith("org_") && (encryptionKey?.length ?? 0) >= 32 && feeConfigured
    ? "configured"
    : "not_configured";
}

export async function GET() {
  let databaseReady = false;
  let authSchemaReady = false;
  let baselineReady = false;
  let memberMobileSchemaReady = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReady = true;

    const [userRow, auditRow, systemAdminRole] = await Promise.all([
      prisma.user.findFirst({ select: { id: true } }),
      prisma.auditLog.findFirst({ select: { id: true } }),
      prisma.role.findUnique({
        where: { code: "SYSTEM_ADMIN" },
        select: { id: true },
      }),
    ]);

    void userRow;
    void auditRow;
    authSchemaReady = true;
    baselineReady = Boolean(systemAdminRole);

    const [passkeyRow, digitalIdRow, paymentConfigRow] = await Promise.all([
      prisma.passkeyCredential.findFirst({ select: { id: true } }),
      prisma.digitalMemberId.findFirst({ select: { id: true } }),
      prisma.chapterPaymentConfig.findFirst({ select: { id: true } }),
    ]);
    void passkeyRow;
    void digitalIdRow;
    void paymentConfigRow;
    memberMobileSchemaReady = true;
  } catch (error) {
    console.error(
      "PSP_READINESS_DATASTORE_ERROR",
      error instanceof Error ? error.name : "UnknownError",
    );
  }

  const authReady = authConfigReady();
  const ready =
    databaseReady &&
    authSchemaReady &&
    baselineReady &&
    memberMobileSchemaReady &&
    authReady;

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      service: SERVICE,
      release: PSP_RELEASE_ID,
      checks: {
        database: databaseReady ? "ok" : "error",
        authSchema: authSchemaReady ? "ok" : "error",
        baseline: baselineReady ? "ok" : "error",
        memberMobileSchema: memberMobileSchemaReady ? "ok" : "error",
        authConfig: authReady ? "ok" : "error",
        smtpConfig: smtpConfigStatus(),
        payMongoPlatformConfig: payMongoPlatformConfigStatus(),
        payMongoLive: process.env.PAYMONGO_LIVE_ENABLED?.trim().toLowerCase() === "true" ? "enabled" : "disabled",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
