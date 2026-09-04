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
    appOriginReady = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").origin === CANONICAL_PRODUCTION_ORIGIN;
  } catch {
    appOriginReady = false;
  }

  return secretReady && appOriginReady;
}

export async function GET() {
  let databaseReady = false;
  let authSchemaReady = false;
  let baselineReady = false;

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
  } catch (error) {
    console.error(
      "PSP_READINESS_DATASTORE_ERROR",
      error instanceof Error ? error.name : "UnknownError",
    );
  }

  const authReady = authConfigReady();
  const ready = databaseReady && authSchemaReady && baselineReady && authReady;

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      service: SERVICE,
      release: PSP_RELEASE_ID,
      checks: {
        database: databaseReady ? "ok" : "error",
        authSchema: authSchemaReady ? "ok" : "error",
        baseline: baselineReady ? "ok" : "error",
        authConfig: authReady ? "ok" : "error",
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
