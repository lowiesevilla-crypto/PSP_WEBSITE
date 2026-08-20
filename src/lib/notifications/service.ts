import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function notifyUser(input: {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? "GENERAL",
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}

export async function notifyChapterMembers(input: {
  chapterId: string;
  type?: NotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  const members = await prisma.member.findMany({
    where: { chapterId: input.chapterId, membershipStatus: "ACTIVE" },
    select: { userId: true },
  });

  if (members.length === 0) return { count: 0 };

  return prisma.notification.createMany({
    data: members.map((member) => ({
      userId: member.userId,
      type: input.type ?? "GENERAL",
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}

export async function notifyAllActiveMembers(input: {
  type?: NotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  const members = await prisma.member.findMany({
    where: { membershipStatus: "ACTIVE" },
    select: { userId: true },
  });

  if (members.length === 0) return { count: 0 };

  return prisma.notification.createMany({
    data: members.map((member) => ({
      userId: member.userId,
      type: input.type ?? "GENERAL",
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}
