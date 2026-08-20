import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/service";

const issueSchema = z.object({ memberId: z.string().min(1) });
const revokeSchema = z.object({ certificateId: z.string().min(1), reason: z.string().trim().min(3).max(1000) });

function certificateNumber() {
  return `PSP-CERT-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid member." }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId }, select: { id: true, userId: true, chapterId: true, membershipStatus: true } });
  if (!member) return NextResponse.json({ message: "Member not found." }, { status: 404 });
  if (!hasPermission(context, "certificates.manage", member.chapterId)) return NextResponse.json({ message: "Certificate management permission required." }, { status: 403 });
  if (member.membershipStatus !== "ACTIVE") return NextResponse.json({ message: "Only active members can receive a certificate." }, { status: 400 });

  const existing = await prisma.certificate.findFirst({ where: { memberId: member.id, status: "VALID" } });
  if (existing) return NextResponse.json({ certificate: existing, created: false });

  const certificate = await prisma.$transaction(async (tx) => {
    const created = await tx.certificate.create({ data: { memberId: member.id, chapterId: member.chapterId, certificateNumber: certificateNumber(), verificationToken: randomBytes(24).toString("base64url") } });
    await tx.auditLog.create({ data: { actorUserId: context.user.id, chapterId: member.chapterId, action: "CERTIFICATE_ISSUED_ADMIN", entityType: "Certificate", entityId: created.id, metadataJson: { memberId: member.id, certificateNumber: created.certificateNumber } } });
    return created;
  });
  await notifyUser({ userId: member.userId, type: "CERTIFICATE", title: "Membership certificate issued", body: `Certificate ${certificate.certificateNumber} is now available.`, href: "/certificate" });
  return NextResponse.json({ certificate, created: true }, { status: 201 });
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
    await tx.auditLog.create({ data: { actorUserId: context.user.id, chapterId: certificate.chapterId, action: "CERTIFICATE_REVOKED", entityType: "Certificate", entityId: certificate.id, metadataJson: { certificateNumber: certificate.certificateNumber, reason: parsed.data.reason } } });
    return result;
  });
  await notifyUser({ userId: certificate.member.userId, type: "CERTIFICATE", title: "Certificate status updated", body: `Certificate ${certificate.certificateNumber} has been revoked.`, href: "/certificate" });
  return NextResponse.json({ certificate: updated });
}
