import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { getChapterPayMongoConfig } from "@/lib/paymongo/chapter-config";
import { getPlatformPayMongoConfig } from "@/lib/paymongo/platform-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  chapterId: z.string().min(1),
  membershipNo: z.string().trim().min(1).max(100),
  amount: z.coerce.number().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Chapter, membership number and TEST dues amount are required." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    if (!hasPermission(context, "finance.manage", input.chapterId)) {
      return NextResponse.json(
        { message: "Chapter finance management permission is required for controlled TEST dues." },
        { status: 403 },
      );
    }

    const platform = getPlatformPayMongoConfig();
    if (platform.mode !== "TEST") {
      return NextResponse.json(
        { message: "Controlled TEST dues can only be created while the PSP PayMongo parent platform is in TEST mode." },
        { status: 409 },
      );
    }

    const chapterGateway = await getChapterPayMongoConfig(input.chapterId);
    if (chapterGateway.mode !== "TEST") {
      return NextResponse.json(
        { message: "Activate this Chapter's online payment in TEST mode before creating a controlled TEST dues assessment." },
        { status: 409 },
      );
    }

    const [chapter, member, assessmentType] = await Promise.all([
      prisma.chapters.findUnique({
        where: { id: input.chapterId },
        select: { id: true, name: true, code: true },
      }),
      prisma.member.findFirst({
        where: {
          chapterId: input.chapterId,
          membershipNo: input.membershipNo,
          membershipStatus: "ACTIVE",
        },
        select: { id: true, membershipNo: true, firstName: true, lastName: true },
      }),
      prisma.assessmentType.findUnique({ where: { code: "MONTHLY_DUES" }, select: { id: true, code: true } }),
    ]);

    if (!chapter) return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
    if (!member) {
      return NextResponse.json(
        { message: "No active member with that membership number exists in the selected Chapter." },
        { status: 404 },
      );
    }
    if (!assessmentType) {
      return NextResponse.json({ message: "Monthly Chapter Dues assessment type is not initialized." }, { status: 500 });
    }

    const amount = input.amount.toFixed(2);
    const now = new Date();
    const title = `[TEST] PayMongo Dues Acceptance - ${now.toISOString().slice(0, 10)}`;

    const result = await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          chapterId: chapter.id,
          assessmentTypeId: assessmentType.id,
          title,
          description: "Controlled PayMongo TEST-mode dues assessment. Single-member acceptance evidence only; no other Chapter member is charged.",
          amount,
          dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      });

      await tx.memberLedgerEntry.create({
        data: {
          chapterId: chapter.id,
          memberId: member.id,
          assessmentId: assessment.id,
          type: "CHARGE",
          amount,
          reference: assessment.id,
          description: title,
          occurredAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: chapter.id,
          action: "PAYMONGO_TEST_DUES_ASSESSMENT_CREATED",
          entityType: "Assessment",
          entityId: assessment.id,
          metadataJson: {
            testOnly: true,
            mode: "TEST",
            membershipNo: member.membershipNo,
            memberId: member.id,
            amount,
            chapterCode: chapter.code,
            purpose: "PayMongo split-payment TEST acceptance",
          },
        },
      });

      return assessment;
    });

    return NextResponse.json(
      {
        assessmentId: result.id,
        title: result.title,
        amount,
        member: {
          membershipNo: member.membershipNo,
          name: `${member.firstName} ${member.lastName}`,
        },
        chapter: { name: chapter.name, code: chapter.code },
        message: "Controlled TEST dues created for one member only. Sign in as that member and complete the PayMongo TEST transaction.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Controlled PayMongo TEST dues error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create controlled TEST dues." },
      { status: 500 },
    );
  }
}
