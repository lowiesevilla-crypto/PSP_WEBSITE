import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";
import { checkCertificateEligibility } from "@/lib/certificates/eligibility";

export const dynamic = "force-dynamic";

function certificateNumber() {
  return `PSP-CERT-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.name === "AuthenticationRequiredError") {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }
  if (error instanceof Error && error.name === "ActiveMemberRequiredError") {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
  console.error("Certificate endpoint error", error);
  return NextResponse.json({ message: "Unable to process certificate request." }, { status: 500 });
}

export async function GET() {
  try {
    const { member } = await requireCurrentMember();
    const certificates = await prisma.certificate.findMany({
      where: { memberId: member.id },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        certificateNumber: true,
        status: true,
        issuedAt: true,
        revokedAt: true,
        revocationReason: true,
        verificationToken: true,
        signatoryName: true,
        signatoryTitle: true,
      },
    });

    return NextResponse.json({ certificates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  try {
    const { context, member } = await requireCurrentMember();

    const existing = await prisma.certificate.findFirst({
      where: { memberId: member.id, status: "VALID" },
      orderBy: { issuedAt: "desc" },
    });
    if (existing) return NextResponse.json({ certificate: existing, created: false });

    const eligibility = await checkCertificateEligibility(member);
    if (!eligibility.eligible) {
      return NextResponse.json({ message: eligibility.reason }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const chairman = await getCurrentChapterChairman(member.chapterId);
    if (!chairman) {
      return NextResponse.json(
        { message: "Your Chapter Chairman must be assigned in the officer directory before a membership certificate can be generated." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const certificate = await tx.certificate.create({
        data: {
          memberId: member.id,
          chapterId: member.chapterId,
          certificateNumber: certificateNumber(),
          verificationToken: randomBytes(24).toString("base64url"),
          signatoryName: chairman.name,
          signatoryTitle: chairman.title,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "CERTIFICATE_ISSUED_SELF_SERVICE",
          entityType: "Certificate",
          entityId: certificate.id,
          metadataJson: {
            certificateNumber: certificate.certificateNumber,
            signatoryName: chairman.name,
            signatoryTitle: chairman.title,
            currentDuesRequired: process.env.CERTIFICATE_REQUIRE_CURRENT_DUES === "true",
          },
        },
      });

      return certificate;
    });

    return NextResponse.json({ certificate: created, created: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
