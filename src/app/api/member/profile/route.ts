import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentMember } from "@/lib/member/current-member";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || null);
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Invalid date." });
      return z.NEVER;
    }
    return date;
  });

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  middleInitial: optionalText(5),
  mobile: optionalText(30),
  address: optionalText(500),
  dateSurvive: optionalDate,
  surviveLocation: optionalText(500),
  birthDate: optionalDate,
});

const PROTECTED_FIELDS = ["chapterId", "chapter", "membershipNo", "pspBirthdayCode", "email"];

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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid profile request." }, { status: 400 });
    }

    const protectedAttempt = PROTECTED_FIELDS.find((field) => field in body);
    if (protectedAttempt) {
      return NextResponse.json(
        { message: "Chapter, membership number, PSP code, and login email are protected membership/account fields and cannot be changed from the member profile." },
        { status: 400 },
      );
    }

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review your profile information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const displayName = [parsed.data.firstName, parsed.data.middleInitial, parsed.data.lastName]
      .filter(Boolean)
      .join(" ");
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.member.update({
        where: { id: member.id },
        data: parsed.data,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleInitial: true,
          mobile: true,
          address: true,
          dateSurvive: true,
          surviveLocation: true,
          birthDate: true,
          updatedAt: true,
        },
      });
      await tx.user.update({
        where: { id: context.user.id },
        data: { displayName },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "MEMBER_PROFILE_UPDATED",
          entityType: "Member",
          entityId: member.id,
          metadataJson: { fields: Object.keys(parsed.data) },
        },
      });
      return result;
    });

    return NextResponse.json({ member: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
