import { NextResponse } from "next/server";
import { membershipRegistrationSchema } from "@/domain/registration/schema";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRIVACY_NOTICE_VERSION = "2026-08-20-v1";

const activeApplicationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CORRECTION_REQUIRED",
  "PENDING_REQUIREMENTS",
  "APPROVED",
] as const;

function isAllowedOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!requestOrigin || !configuredAppUrl) return true;

  try {
    return requestOrigin === new URL(configuredAppUrl).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      {
        error: "ORIGIN_NOT_ALLOWED",
        message: "This registration request is not allowed from the current origin.",
      },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_MEDIA_TYPE",
        message: "Membership registration requires a JSON request.",
      },
      { status: 415 },
    );
  }

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
        message: "Please review the registration information and required acknowledgements.",
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

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.membershipApplication.create({
      data: {
        chapterId: input.chapterId,
        firstName: input.firstName,
        lastName: input.lastName,
        middleInitial: input.middleInitial,
        address: input.address,
        email: input.email,
        mobile: input.mobile,
        dateSurvive: input.dateSurvive,
        surviveLocation: input.surviveLocation,
        pspBirthdayCode: input.pspBirthdayCode,
        birthDate: input.birthDate,
        status: "SUBMITTED",
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        chapterId: input.chapterId,
        action: "MEMBERSHIP_APPLICATION_SUBMITTED",
        entityType: "MembershipApplication",
        entityId: created.id,
        metadataJson: {
          source: "PUBLIC_REGISTRATION",
          applicationAcknowledged: input.applicationAcknowledged,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        chapterId: input.chapterId,
        action: "DATA_PRIVACY_NOTICE_ACKNOWLEDGED",
        entityType: "MembershipApplication",
        entityId: created.id,
        metadataJson: {
          source: "PUBLIC_REGISTRATION",
          privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
          acknowledged: input.privacyAcknowledged,
          acknowledgedAt: new Date().toISOString(),
        },
      },
    });

    return created;
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
