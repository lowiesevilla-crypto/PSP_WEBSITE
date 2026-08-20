import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizedChapterIds, getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "TRANSFERRED",
  "RESIGNED",
  "DECEASED",
  "ARCHIVED",
]);

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const scope = authorizedChapterIds(context, "members.view");
  if (scope !== null && scope.length === 0) {
    return NextResponse.json({ message: "Permission denied." }, { status: 403 });
  }

  const requestedChapterId = request.nextUrl.searchParams.get("chapterId")?.trim() || null;
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) || null;
  const rawStatus = request.nextUrl.searchParams.get("status")?.trim() || null;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(10, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));

  if (requestedChapterId && scope !== null && !scope.includes(requestedChapterId)) {
    return NextResponse.json({ message: "Permission denied for the requested chapter." }, { status: 403 });
  }

  const parsedStatus = rawStatus ? statusSchema.safeParse(rawStatus) : null;
  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ message: "Invalid membership status." }, { status: 400 });
  }

  const chapterFilter = requestedChapterId
    ? requestedChapterId
    : scope === null
      ? undefined
      : { in: scope };

  const where = {
    ...(chapterFilter ? { chapterId: chapterFilter } : {}),
    ...(parsedStatus?.success ? { membershipStatus: parsedStatus.data } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { membershipNo: { contains: q } },
            { pspBirthdayCode: { contains: q } },
            { user: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const [members, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        membershipNo: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        mobile: true,
        dateSurvive: true,
        surviveLocation: true,
        pspBirthdayCode: true,
        birthDate: true,
        membershipStatus: true,
        joinedAt: true,
        user: { select: { email: true, status: true } },
        chapter: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return NextResponse.json(
    {
      members,
      pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
