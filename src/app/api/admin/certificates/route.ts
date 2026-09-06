import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/service";
import { checkCertificateEligibility } from "@/lib/certificates/eligibility";
import { sendCertificateIssuedEmail, type CertificateDeliveryInput } from "@/lib/certificates/delivery";

const certificateTypes = ["MEMBERSHIP", "ATTENDANCE", "APPRECIATION", "RECOGNITION", "OUTSTANDING_MEMBER", "CUSTOM"] as const;
const issueSchema = z.object({
  memberId: z.string().min(1).optional(),
  memberIds: z.array(z.string().min(1)).min(1).max(2000).optional(),
  chapterId: z.string().min(1).optional(),
  selectAll: z.boolean().optional(),
  certificateType: z.enum(certificateTypes).optional().default("MEMBERSHIP"),
  title: z.string().trim().min(3).max(120).optional(),
  citationText: z.string().trim().max(1500).optional(),
  certificateDate: z.string().trim().optional(),
  referenceLabel: z.string().trim().max(180).optional(),
  batchId: z.string().trim().min(8).max(100).optional(),
}).refine((value) => Boolean(value.memberId || value.memberIds?.length || (value.selectAll && value.chapterId)), {
  message: "Select at least one certificate recipient.",
});
const revokeSchema = z.object({ certificateId: z.string().min(1), reason: z.string().trim().min(3).max(1000) });
const deleteSchema = z.object({ certificateId: z.string().min(1), reason: z.string().trim().min(3).max(1000).optional() });

const titleByType: Record<(typeof certificateTypes)[number], string> = {
  MEMBERSHIP: "Certificate of Membership",
  ATTENDANCE: "Certificate of Attendance",
  APPRECIATION: "Certificate of Appreciation",
  RECOGNITION: "Certificate of Recognition",
  OUTSTANDING_MEMBER: "Outstanding Member Certificate",
  CUSTOM: "Certificate of Recognition",
};

function certificateNumber() {
  return `PSP-CERT-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function parseCertificateDate(value: string | undefined) {
  if (!value) return new Date();
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Please review the certificate details and recipients." }, { status: 400 });

  const input = parsed.data;
  const certificateDate = parseCertificateDate(input.certificateDate);
  if (!certificateDate) return NextResponse.json({ message: "Certificate date is invalid." }, { status: 400 });

  let requestedMemberIds = Array.from(new Set([...(input.memberIds ?? []), ...(input.memberId ? [input.memberId] : [])]));
  if (input.selectAll) {
    if (!input.chapterId || !hasPermission(context, "certificates.manage", input.chapterId)) {
      return NextResponse.json({ message: "Certificate management permission is required for the selected Chapter." }, { status: 403 });
    }
    const chapterMembers = await prisma.member.findMany({
      where: { chapterId: input.chapterId, membershipStatus: "ACTIVE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true },
    });
    requestedMemberIds = chapterMembers.map((member) => member.id);
  }
  if (!requestedMemberIds.length) return NextResponse.json({ message: "No eligible recipients were found." }, { status: 400 });

  const members = await prisma.member.findMany({
    where: { id: { in: requestedMemberIds } },
    select: {
      id: true,
      userId: true,
      chapterId: true,
      membershipNo: true,
      membershipStatus: true,
      firstName: true,
      middleInitial: true,
      lastName: true,
      user: { select: { email: true } },
      chapter: { select: { id: true, name: true, logoUrl: true, email: true } },
    },
  });
  if (members.length !== requestedMemberIds.length) {
    return NextResponse.json({ message: "One or more selected members could not be found." }, { status: 404 });
  }
  const unauthorized = members.find((member) => !hasPermission(context, "certificates.manage", member.chapterId));
  if (unauthorized) {
    return NextResponse.json({ message: "Certificate management permission is required for every selected recipient Chapter." }, { status: 403 });
  }

  const certificateType = input.certificateType;
  const title = input.title?.trim() || titleByType[certificateType];
  if (certificateType === "CUSTOM" && !input.title?.trim()) {
    return NextResponse.json({ message: "A custom certificate title is required." }, { status: 400 });
  }
  const batchId = input.batchId ?? `cert-batch-${randomBytes(12).toString("hex")}`;
  const chairmen = new Map<string, Awaited<ReturnType<typeof getCurrentChapterChairman>>>();
  const results: Array<{ memberId: string; certificateId?: string; created: boolean; message: string }> = [];
  const createdCertificates: CertificateDeliveryInput[] = [];

  for (const member of members) {
    if (member.membershipStatus !== "ACTIVE") {
      results.push({ memberId: member.id, created: false, message: "Member is not active." });
      continue;
    }

    if (certificateType === "MEMBERSHIP") {
      const existingMembership = await prisma.certificate.findFirst({
        where: { memberId: member.id, certificateType: "MEMBERSHIP", status: "VALID" },
        orderBy: { issuedAt: "desc" },
      });
      if (existingMembership) {
        results.push({ memberId: member.id, certificateId: existingMembership.id, created: false, message: "A valid Membership Certificate already exists." });
        continue;
      }
      const eligibility = await checkCertificateEligibility(member);
      if (!eligibility.eligible) {
        results.push({ memberId: member.id, created: false, message: eligibility.reason });
        continue;
      }
    }

    const priorBatchCertificate = await prisma.certificate.findFirst({ where: { batchId, memberId: member.id } });
    if (priorBatchCertificate) {
      results.push({ memberId: member.id, certificateId: priorBatchCertificate.id, created: false, message: "This recipient was already issued in the same certificate batch." });
      continue;
    }

    let chairman = chairmen.get(member.chapterId);
    if (chairman === undefined) {
      chairman = await getCurrentChapterChairman(member.chapterId);
      chairmen.set(member.chapterId, chairman);
    }
    if (!chairman) {
      results.push({ memberId: member.id, created: false, message: `Assign the current Chapter Chairman for ${member.chapter.name} before issuing certificates.` });
      continue;
    }

    const certificate = await prisma.$transaction(async (tx) => {
      const created = await tx.certificate.create({
        data: {
          memberId: member.id,
          chapterId: member.chapterId,
          certificateNumber: certificateNumber(),
          certificateType,
          title,
          citationText: input.citationText?.trim() || null,
          certificateDate,
          referenceLabel: input.referenceLabel?.trim() || null,
          batchId,
          verificationToken: randomBytes(24).toString("base64url"),
          signatoryName: chairman.name,
          signatoryTitle: chairman.title,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "CERTIFICATE_ISSUED_ADMIN",
          entityType: "Certificate",
          entityId: created.id,
          metadataJson: {
            memberId: member.id,
            certificateNumber: created.certificateNumber,
            certificateType,
            title,
            batchId,
            signatoryName: chairman.name,
            signatoryTitle: chairman.title,
            currentDuesRequired: certificateType === "MEMBERSHIP" && process.env.CERTIFICATE_REQUIRE_CURRENT_DUES === "true",
          },
        },
      });
      return created;
    });

    const memberName = [member.firstName, member.middleInitial, member.lastName].filter(Boolean).join(" ");
    createdCertificates.push({
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      title: certificate.title,
      citationText: certificate.citationText,
      certificateDate: certificate.certificateDate,
      referenceLabel: certificate.referenceLabel,
      issuedAt: certificate.issuedAt,
      verificationToken: certificate.verificationToken,
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
    results.push({ memberId: member.id, certificateId: certificate.id, created: true, message: "Certificate issued." });
  }

  for (const certificate of createdCertificates) {
    await notifyUser({
      userId: members.find((member) => member.user.email === certificate.memberEmail && member.membershipNo === certificate.membershipNo)?.userId ?? "",
      type: "CERTIFICATE",
      title: `${certificate.title} issued`,
      body: `${certificate.title} (${certificate.certificateNumber}) is now available for download.`,
      href: "/certificate",
    });
  }

  let emailSentCount = 0;
  let emailFailedCount = 0;
  const emailDeliveryByCertificate = new Map<string, "sent" | "failed">();
  for (let offset = 0; offset < createdCertificates.length; offset += 5) {
    const group = createdCertificates.slice(offset, offset + 5);
    const deliveryResults = await Promise.all(group.map(async (certificate) => {
      try {
        await sendCertificateIssuedEmail(certificate);
        await prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: certificate.chapterId,
            action: "CERTIFICATE_EMAIL_SENT",
            entityType: "Certificate",
            entityId: certificate.certificateId,
            metadataJson: { certificateNumber: certificate.certificateNumber },
          },
        });
        return { certificateId: certificate.certificateId, delivered: true as const };
      } catch (error) {
        console.error("Certificate email delivery failed", error);
        await prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: certificate.chapterId,
            action: "CERTIFICATE_EMAIL_FAILED",
            entityType: "Certificate",
            entityId: certificate.certificateId,
            metadataJson: {
              certificateNumber: certificate.certificateNumber,
              errorName: error instanceof Error ? error.name : "UnknownError",
            },
          },
        });
        return { certificateId: certificate.certificateId, delivered: false as const };
      }
    }));
    for (const delivery of deliveryResults) {
      emailDeliveryByCertificate.set(delivery.certificateId, delivery.delivered ? "sent" : "failed");
      if (delivery.delivered) emailSentCount += 1;
      else emailFailedCount += 1;
    }
  }

  if (input.memberId && !input.memberIds && !input.selectAll && certificateType === "MEMBERSHIP") {
    const result = results[0];
    if (!result) return NextResponse.json({ message: "Unable to process certificate." }, { status: 500 });
    const certificate = result.certificateId ? await prisma.certificate.findUnique({ where: { id: result.certificateId } }) : null;
    if (!certificate) return NextResponse.json({ message: result.message }, { status: 409 });
    return NextResponse.json({
      certificate,
      created: result.created,
      emailDelivery: result.created ? emailDeliveryByCertificate.get(certificate.id) ?? "failed" : "not_sent",
    }, { status: result.created ? 201 : 200 });
  }

  return NextResponse.json(
    {
      batchId,
      certificateType,
      title,
      requestedCount: requestedMemberIds.length,
      createdCount: createdCertificates.length,
      skippedCount: results.length - createdCertificates.length,
      emailSentCount,
      emailFailedCount,
      results,
    },
    { status: createdCertificates.length ? 201 : 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Revocation reason is required." }, { status: 400 });

  const certificate = await prisma.certificate.findUnique({ where: { id: parsed.data.certificateId }, include: { member: { select: { userId: true } } } });
  if (!certificate) return NextResponse.json({ message: "Certificate not found." }, { status: 404 });
  if (!hasPermission(context, "certificates.manage", certificate.chapterId)) return NextResponse.json({ message: "Certificate management permission required." }, { status: 403 });
  if (certificate.status !== "VALID") return NextResponse.json({ message: `Certificate is already ${certificate.status}.` }, { status: 409 });

  const revokedAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.certificate.update({ where: { id: certificate.id }, data: { status: "REVOKED", revokedAt, revocationReason: parsed.data.reason } });
    await tx.auditLog.create({ data: { actorUserId: context.user.id, chapterId: certificate.chapterId, action: "CERTIFICATE_REVOKED", entityType: "Certificate", entityId: certificate.id, metadataJson: { certificateNumber: certificate.certificateNumber, certificateType: certificate.certificateType, title: certificate.title, reason: parsed.data.reason } } });
    return result;
  });
  await notifyUser({ userId: certificate.member.userId, type: "CERTIFICATE", title: "Certificate status updated", body: `${certificate.title} (${certificate.certificateNumber}) has been revoked.`, href: "/certificate" });
  return NextResponse.json({ certificate: updated });
}

export async function DELETE(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Certificate ID is required." }, { status: 400 });

  const certificate = await prisma.certificate.findUnique({
    where: { id: parsed.data.certificateId },
    include: { member: { select: { userId: true } } },
  });
  if (!certificate) return NextResponse.json({ message: "Certificate not found." }, { status: 404 });
  if (!hasPermission(context, "certificates.manage", certificate.chapterId)) {
    return NextResponse.json({ message: "Certificate management permission required." }, { status: 403 });
  }
  if (certificate.status !== "VALID") {
    return NextResponse.json({ message: `Certificate is already ${certificate.status}.` }, { status: 409 });
  }

  const reason = parsed.data.reason?.trim() || "Deleted and invalidated by an authorized administrator.";
  const revokedAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.certificate.update({
      where: { id: certificate.id },
      data: { status: "REVOKED", revokedAt, revocationReason: reason },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: context.user.id,
        chapterId: certificate.chapterId,
        action: "CERTIFICATE_DELETED_INVALIDATED",
        entityType: "Certificate",
        entityId: certificate.id,
        metadataJson: {
          certificateNumber: certificate.certificateNumber,
          certificateType: certificate.certificateType,
          title: certificate.title,
          reason,
        },
      },
    });
    return result;
  });

  await notifyUser({
    userId: certificate.member.userId,
    type: "CERTIFICATE",
    title: "Certificate invalidated",
    body: `${certificate.title} (${certificate.certificateNumber}) has been deleted from active certificates and marked invalid.`,
    href: "/certificate",
  });

  return NextResponse.json({ certificate: updated, invalidated: true }, { headers: { "Cache-Control": "no-store" } });
}
