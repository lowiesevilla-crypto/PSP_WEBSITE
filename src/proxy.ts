import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SERVER_TO_SERVER_PATHS = new Set(["/api/webhooks/paymongo"]);
const CANONICAL_PRODUCTION_ORIGIN = "https://psp.hoahub.tech";

function trustedOrigins(request: NextRequest) {
  const origins = new Set<string>([CANONICAL_PRODUCTION_ORIGIN]);
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // Keep the approved canonical production origin and do not trust a malformed configured value.
    }
  } else {
    // Local/test deployments without an explicit app URL may trust their own request origin.
    origins.add(request.nextUrl.origin);
  }

  return origins;
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();
  if (SERVER_TO_SERVER_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const expected = trustedOrigins(request);

  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { message: "Cross-site request rejected." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (origin && !expected.has(origin)) {
    return NextResponse.json(
      { message: "Request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
