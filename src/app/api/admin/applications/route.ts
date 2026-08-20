import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizedChapterIds,
  getAuthContext,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "CORRECTION_REQUIRED",
  "PENDING_REQUIREMENTS",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const allowedChapterIds = authorizedChapterIds(context, "applications.view");
  if (allowedChapterIds !== null && allowedChapterIds.length === 0) {
    return NextResponse.json({ message: "Permission denied." }, { status: 403 });
  }

  const requestedChapterId = request.nextUrl.searchParams.get("chapterId")?.trim() || null;
  const rawStatus = request.nextUrl.searchParams.get("status")?.trim() || null;
  const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) || null;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(10, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));

  if (
    requestedChapterId &&
    allowedChapterIds !== null &&
    !allowedChapterIds.includes(requestedChapterId)
  ) {
    return NextResponse.json({ message: "Permission denied for the requested chapter." }, { status: 403 });
  }

  const status = rawStatus ? statusSchema.safeParse(rawStatus) : null;
  if (status && !status.success) {
    return NextResponse.json({ message: "Invalid application status filter." }, { status: 400 });
  }

  const chapterFilter = requestedChapterId
    ? requestedChapterId
    : allowedChapterIds === null
      ? undefined
      : { in: allowedChapterIds };

  const where = {
    ...(chapterFilter ? { chapterId: chapterFilter } : {}),
    ...(status?.success ? { status: status.data } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { pspBirthdayCode: { contains: search } },
          ],
        }
      : {}),
  };

  const [applications, total] = await prisma.$transaction([
    prisma.membershipApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        address: true,
        email: true,
        mobile: true,
        dateSurvive: true,
        surviveLocation: true,
        pspBirthdayCode: true,
        birthDate: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        reviewNotes: true,
        chapter: {
          select: { id: true, code: true, name: true },
        },
      },
    }),
    prisma.membershipApplication.count({ where }),
  ]);

  return NextResponse.json(
    {
      applications,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
