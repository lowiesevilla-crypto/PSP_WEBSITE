import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

export async function GET() {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: context.user.id,
        email: context.user.email,
        displayName: context.user.displayName,
        member: context.user.member,
      },
      assignments: context.assignments,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
