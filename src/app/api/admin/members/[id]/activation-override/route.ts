import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  hasPermission,
  requirePermission,
} from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SET_TEMPORARY_PASSWORD"),
    temporaryPassword: z.string().min(1).max(128),
  }),
  z.object({ action: z.literal("RESET_ACTIVATION") }),
]);

const protectedAdminPermissions = new Set([
  "chapters.manage",
  "applications.review",
  "members.manage",
  "roles.manage",
  "finance.manage",
  "content.manage",
  "events.manage",
  "certificates.manage",
  "audit.view",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          passwordHash: true,
          emailVerifiedAt: true,
          roleAssignments: {
            where: {
              startsAt: { lte: new Date() },
              OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            },
            select: {
              chapterId: true,
              role: {
                select: {
                  code: true,
                  permissions: {
                    select: { permission: { select: { code: true } } },
                  },
                },
              },
            },
          },
        },
      },
      chapter: { select: { id: true, name: true } },
    },
  });

  if (!member) {
    return NextResponse.json({ message: "Member not found." }, { status: 404 });
  }

  try {
    const context = await requirePermission("members.manage", member.chapterId);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid activation override request." }, { status: 400 });
    }

    if (member.membershipStatus !== "ACTIVE") {
      return NextResponse.json(
        { message: "Only approved active memberships can use the activation override." },
        { status: 409 },
      );
    }

    if (member.user.status === "SUSPENDED" || member.user.status === "DISABLED") {
      return NextResponse.json(
        { message: "Suspended or disabled accounts must be restored through the account-status process before activation." },
        { status: 409 },
      );
    }

    if (member.user.id === context.user.id) {
      return NextResponse.json(
        { message: "You cannot use the administrator activation override on your own signed-in account. Use the normal password recovery process instead." },
        { status: 409 },
      );
    }

    const targetHasAdminAuthority = member.user.roleAssignments.some((assignment) =>
      assignment.role.permissions.some((entry) => protectedAdminPermissions.has(entry.permission.code)),
    );
    const actorHasNationalMemberAuthority = hasPermission(context, "members.manage", null);
    if (targetHasAdminAuthority && !actorHasNationalMemberAuthority) {
      return NextResponse.json(
        { message: "National Administration is required to reset or override credentials for another administrator account." },
        { status: 403 },
      );
    }

    if (parsed.data.action === "SET_TEMPORARY_PASSWORD") {
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(parsed.data.temporaryPassword);
      } catch (error) {
        return NextResponse.json(
          { message: error instanceof Error ? error.message : "Temporary password does not meet requirements." },
          { status: 400 },
        );
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: member.user.id },
          data: {
            passwordHash,
            status: "INVITED",
          },
        }),
        prisma.auditLog.create({
          data: {
            actorUserId: context.user.id,
            chapterId: member.chapterId,
            action: "MEMBER_ADMIN_TEMPORARY_PASSWORD_SET",
            entityType: "Member",
            entityId: member.id,
            beforeJson: {
              accountStatus: member.user.status,
              hadPassword: Boolean(member.user.passwordHash),
              emailVerified: Boolean(member.user.emailVerifiedAt),
            },
            afterJson: {
              accountStatus: "INVITED",
              temporaryPasswordRequired: true,
              forcePermanentPasswordOnLogin: true,
            },
          },
        }),
      ]);

      return NextResponse.json(
        {
          message: `Temporary password set for ${member.user.displayName}. Give it to the member manually. PSP will require a different permanent password at first sign-in.`,
          accountStatus: "INVITED",
          passwordChangeRequired: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: member.user.id },
        data: {
          passwordHash: null,
          emailVerifiedAt: null,
          status: "INVITED",
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: context.user.id,
          chapterId: member.chapterId,
          action: "MEMBER_ADMIN_ACTIVATION_RESET",
          entityType: "Member",
          entityId: member.id,
          beforeJson: {
            accountStatus: member.user.status,
            hadPassword: Boolean(member.user.passwordHash),
            emailVerified: Boolean(member.user.emailVerifiedAt),
          },
          afterJson: {
            accountStatus: "INVITED",
            hasPassword: false,
            emailVerified: false,
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        message: `Activation reset for ${member.user.displayName}. You can resend the normal activation invitation or set a new temporary password.`,
        accountStatus: "INVITED",
        passwordChangeRequired: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationDeniedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    console.error("Member activation override error", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ message: "Unable to update member activation." }, { status: 500 });
  }
}
