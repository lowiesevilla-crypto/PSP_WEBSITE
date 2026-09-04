import { NextResponse } from "next/server";
import { PSP_RELEASE_ID } from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "psi-sigma-phi-digital-platform",
      release: PSP_RELEASE_ID,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
