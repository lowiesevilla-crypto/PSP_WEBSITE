import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  mobile: z.string().trim().max(30).optional().transform((value) => value || null),
  address: z.string().trim().max(500).optional().transform((value) => value || null),
});

function errorResponse(error: unknown) {
  if (error instanceof Error && error.name === "AuthenticationRequiredError") {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }
  if (error instanceof Error && error.name === "ActiveMemberRequiredError") {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
  console.error("Member profile error", error);
  return NextResponse.json({ message: "Unable to process member profile." }, { status: 500 });
}

export async function GET() {
  try {
    const { member } = await requireCurrentMember();
    return NextResponse.json(
      {
        member: {
          id: member.id,
          membershipNo: member.membershipNo,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.middleInitial,
          email: member.user.email,
          mobile: member.mobile,
          address: member.address,
          dateSurvive: member.dateSurvive,
          surviveLocation: member.surviveLocation,
          pspBirthdayCode: member.pspBirthdayCode,
          birthDate: member.birthDate,
          chapter: member.chapter,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { context, member } = await requireCurrentMember();
    const body = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review your profile information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: parsed.data,
      select: { id: true, mobile: true, address: true, updatedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: context.user.id,
        chapterId: member.chapterId,
        action: "MEMBER_PROFILE_UPDATED",
        entityType: "Member",
        entityId: member.id,
        metadataJson: { fields: Object.keys(parsed.data) },
      },
    });

    return NextResponse.json({ member: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
