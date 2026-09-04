import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requirePermission,
} from "@/lib/auth/context";
import { applicationUrl, createActivationToken } from "@/lib/auth/account-tokens";
import { escapeHtml, sendEmail } from "@/lib/email/mailer";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  displayName: z.string().trim().min(2).max(191),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chapterId } = await params;

  try {
    const context = await requirePermission("chapters.manage", chapterId);
    const chapter = await prisma.chapters.findUnique({
      where: { id: chapterId },
      select: { id: true, name: true, status: true },
    });
    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
    }
    if (chapter.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Activate this chapter before assigning a Chapter Administrator." },
        { status: 409 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please review the administrator information.", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const role = await prisma.role.findUnique({ where: { code: "CHAPTER_ADMIN" } });
    if (!role) {
      return NextResponse.json({ message: "Chapter Admin role is not initialized." }, { status: 503 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser && ["SUSPENDED", "DISABLED"].includes(existingUser.status)) {
      return NextResponse.json(
        { message: "This account is suspended or disabled and cannot be assigned." },
        { status: 409 },
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const assignedUser = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { displayName: existingUser.displayName || parsed.data.displayName },
          })
        : await tx.user.create({
            data: {
              email: parsed.data.email,
              displayName: parsed.data.displayName,
              status: "INVITED",
            },
          });

      const existingAssignment = await tx.userRoleAssignment.findFirst({
        where: {
          userId: assignedUser.id,
          roleId: role.id,
          chapterId,
          endsAt: null,
        },
      });

      if (!existingAssignment) {
        await tx.userRoleAssignment.create({
          data: {
            userId: assignedUser.id,
            roleId: role.id,
            chapterId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId,
          action: "CHAPTER_ADMIN_ASSIGNED",
          entityType: "User",
          entityId: assignedUser.id,
          metadataJson: { roleCode: "CHAPTER_ADMIN" },
        },
      });

      return assignedUser;
    });

    let activationDelivery: "not-required" | "sent" | "failed" = "not-required";
    if (user.status === "INVITED" || !user.emailVerifiedAt || !user.passwordHash) {
      try {
        const token = createActivationToken({ id: user.id, email: user.email });
        const activationUrl = applicationUrl(`/activate?token=${encodeURIComponent(token)}`);
        await sendEmail({
          to: user.email,
          subject: `Psi Sigma Phi Chapter Administrator access — ${chapter.name}`,
          text: `Hello ${user.displayName},\n\nYou were assigned as a Chapter Administrator for ${chapter.name}. Activate your account using this secure link: ${activationUrl}\n\nThe activation link expires in 24 hours.`,
          html: `<p>Hello ${escapeHtml(user.displayName)},</p><p>You were assigned as a Chapter Administrator for <strong>${escapeHtml(chapter.name)}</strong>.</p><p><a href="${escapeHtml(activationUrl)}">Activate Account</a></p><p>The activation link expires in 24 hours.</p>`,
        });
        activationDelivery = "sent";
      } catch {
        activationDelivery = "failed";
        await prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId,
            action: "CHAPTER_ADMIN_ACTIVATION_EMAIL_FAILED",
            entityType: "User",
            entityId: user.id,
          },
        });
      }
    }

    return NextResponse.json(
      {
        administrator: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          status: user.status,
        },
        activationDelivery,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationDeniedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    throw error;
  }
}
