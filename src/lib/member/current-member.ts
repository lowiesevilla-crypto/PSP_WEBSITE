import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/context";

export class ActiveMemberRequiredError extends Error {
  constructor() {
    super("An active member account is required.");
    this.name = "ActiveMemberRequiredError";
  }
}

export async function requireCurrentMember() {
  const context = await requireAuthContext();
  const member = await prisma.member.findUnique({
    where: { userId: context.user.id },
    include: {
      chapter: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          foundingDate: true,
          address: true,
          logoUrl: true,
          status: true,
        },
      },
      user: {
        select: { id: true, email: true, displayName: true },
      },
    },
  });

  if (!member || member.membershipStatus !== "ACTIVE") {
    throw new ActiveMemberRequiredError();
  }

  return { context, member };
}
