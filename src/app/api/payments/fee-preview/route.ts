import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCurrentMember } from "@/lib/member/current-member";
import { calculatePlatformConvenienceFee, getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";

const schema = z.object({ amount: z.coerce.number().positive().max(10000000) });

export async function GET(request: Request) {
  try {
    await requireCurrentMember();
    const parsed = schema.safeParse({ amount: new URL(request.url).searchParams.get("amount") });
    if (!parsed.success) {
      return NextResponse.json({ message: "A valid payment amount is required." }, { status: 400 });
    }

    const amount = new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2);
    const split = calculatePlatformConvenienceFee(amount, getPlatformPayMongoConfig());
    return NextResponse.json(
      {
        chapterAmount: amount.toFixed(2),
        platformFee: split.feeAmount.toFixed(2),
        totalAmount: split.grossAmount.toFixed(2),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "AuthenticationRequiredError" || error.name === "ActiveMemberRequiredError")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to calculate platform convenience fee." },
      { status: 503 },
    );
  }
}
