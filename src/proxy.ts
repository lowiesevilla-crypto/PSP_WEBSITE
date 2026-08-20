import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SERVER_TO_SERVER_PATHS = new Set(["/api/webhooks/paymongo"]);

function trustedOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request origin only for a malformed non-production configuration.
    }
  }
  return request.nextUrl.origin;
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();
  if (SERVER_TO_SERVER_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const expected = trustedOrigin(request);

  if (fetchSite === "cross-site") {
    return NextResponse.json({ message: "Cross-site request rejected." }, { status: 403 });
  }

  if (origin && origin !== expected) {
    return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
