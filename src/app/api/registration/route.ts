import { NextResponse } from "next/server";
import { membershipRegistrationSchema } from "@/domain/registration/schema";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const activeApplicationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CORRECTION_REQUIRED",
  "PENDING_REQUIREMENTS",
  "APPROVED",
] as const;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_JSON",
        message: "The registration request is not valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = membershipRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Please review the registration information.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const chapter = await prisma.chapters.findFirst({
    where: {
      id: input.chapterId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    return NextResponse.json(
      {
        error: "CHAPTER_UNAVAILABLE",
        message: "The selected chapter is not available for registration.",
      },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      member: {
        select: {
          id: true,
        },
      },
    },
  });

  if (existingUser?.member) {
    return NextResponse.json(
      {
        error: "MEMBER_ALREADY_EXISTS",
        message: "An existing member account already uses this email address.",
      },
      { status: 409 },
    );
  }

  const existingApplication = await prisma.membershipApplication.findFirst({
    where: {
      email: input.email,
      status: {
        in: [...activeApplicationStatuses],
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingApplication) {
    return NextResponse.json(
      {
        error: "APPLICATION_ALREADY_EXISTS",
        message: "An active membership application already exists for this email address.",
      },
      { status: 409 },
    );
  }

  const application = await prisma.membershipApplication.create({
    data: {
      chapterId: input.chapterId,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      suffix: input.suffix,
      email: input.email,
      mobile: input.mobile,
      birthDate: input.birthDate,
      address: input.address,
      status: "SUBMITTED",
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
    },
  });

  return NextResponse.json(
    {
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt.toISOString(),
      },
      message:
        "Your membership application was submitted for review. Submission does not yet mean active membership.",
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
