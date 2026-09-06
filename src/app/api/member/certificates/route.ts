import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";
import { checkCertificateEligibility } from "@/lib/certificates/eligibility";
import { sendCertificateIssuedEmail } from "@/lib/certificates/delivery";

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
      orderBy: [{ certificateDate: "desc" }, { issuedAt: "desc" }],
      select: {
        id: true,
        certificateNumber: true,
        certificateType: true,
        title: true,
        citationText: true,
        certificateDate: true,
        referenceLabel: true,
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
      where: { memberId: member.id, certificateType: "MEMBERSHIP", status: "VALID" },
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

    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const certificate = await tx.certificate.create({
        data: {
          memberId: member.id,
          chapterId: member.chapterId,
          certificateNumber: certificateNumber(),
          certificateType: "MEMBERSHIP",
          title: "Certificate of Membership",
          certificateDate: now,
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
            certificateType: certificate.certificateType,
            signatoryName: chairman.name,
            signatoryTitle: chairman.title,
            currentDuesRequired: process.env.CERTIFICATE_REQUIRE_CURRENT_DUES === "true",
          },
        },
      });

      return certificate;
    });

    const memberName = [member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ");
    let emailDelivery: "sent" | "failed" = "failed";
    try {
      await sendCertificateIssuedEmail({
        certificateId: created.id,
        certificateNumber: created.certificateNumber,
        certificateType: created.certificateType,
        title: created.title,
        citationText: created.citationText,
        certificateDate: created.certificateDate,
        referenceLabel: created.referenceLabel,
        issuedAt: created.issuedAt,
        verificationToken: created.verificationToken,
        memberName,
        membershipNo: member.membershipNo,
        memberEmail: member.user.email,
        chapterId: member.chapterId,
        chapterName: member.chapter.name,
        chapterLogoUrl: member.chapter.logoUrl,
        chapterEmail: member.chapter.email,
        signatoryName: chairman.name,
        signatoryTitle: chairman.title,
      });
      emailDelivery = "sent";
      await prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "CERTIFICATE_EMAIL_SENT",
          entityType: "Certificate",
          entityId: created.id,
          metadataJson: { certificateNumber: created.certificateNumber, recipientUserId: member.userId },
        },
      });
    } catch (error) {
      console.error("Certificate email delivery failed", error);
      await prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "CERTIFICATE_EMAIL_FAILED",
          entityType: "Certificate",
          entityId: created.id,
          metadataJson: {
            certificateNumber: created.certificateNumber,
            recipientUserId: member.userId,
            errorName: error instanceof Error ? error.name : "UnknownError",
          },
        },
      });
    }

    return NextResponse.json({ certificate: created, created: true, emailDelivery }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
