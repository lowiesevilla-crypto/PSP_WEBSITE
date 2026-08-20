import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentMember } from "@/lib/member/current-member";

export const dynamic = "force-dynamic";

function certificateNumber() {
  return `PSP-CERT-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const member = await requireCurrentMember();
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
    },
  });

  return NextResponse.json({ certificates }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const member = await requireCurrentMember();
  if (member.membershipStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Only active members can receive a membership certificate." }, { status: 403 });
  }

  const existing = await prisma.certificate.findFirst({
    where: { memberId: member.id, status: "VALID" },
    orderBy: { issuedAt: "desc" },
  });
  if (existing) return NextResponse.json({ certificate: existing, created: false });

  const created = await prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.create({
      data: {
        memberId: member.id,
        chapterId: member.chapterId,
        certificateNumber: certificateNumber(),
        verificationToken: randomBytes(24).toString("base64url"),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: member.userId,
        chapterId: member.chapterId,
        action: "CERTIFICATE_ISSUED_SELF_SERVICE",
        entityType: "Certificate",
        entityId: certificate.id,
        metadataJson: { certificateNumber: certificate.certificateNumber },
      },
    });

    return certificate;
  });

  return NextResponse.json({ certificate: created, created: true }, { status: 201 });
}
