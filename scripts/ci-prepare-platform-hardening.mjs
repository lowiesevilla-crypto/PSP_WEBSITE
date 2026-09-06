import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alphaMember = await prisma.member.findUnique({ where: { id: "ci-alpha-member" } });
  if (!alphaMember) throw new Error("Isolation fixtures must run before platform hardening fixtures.");

  await prisma.chapterPaymentConfig.deleteMany({
    where: { chapterId: { in: ["ci-chapter-alpha", "ci-chapter-beta"] } },
  });
  await prisma.certificate.deleteMany({
    where: { batchId: { in: ["ci-platform-hardening-batch", "ci-cross-chapter-batch"] } },
  });
  await prisma.announcement.deleteMany({
    where: { id: { in: ["ci-alpha-public-announcement", "ci-alpha-private-announcement"] } },
  });
  await prisma.event.deleteMany({ where: { id: "ci-alpha-public-event" } });

  const chairmanPosition = await prisma.chapterPosition.upsert({
    where: { chapterId_code: { chapterId: "ci-chapter-alpha", code: "CHAIRMAN" } },
    update: { name: "Chapter Chairman", level: 0, isActive: true },
    create: {
      chapterId: "ci-chapter-alpha",
      code: "CHAIRMAN",
      name: "Chapter Chairman",
      level: 0,
      isActive: true,
    },
  });

  await prisma.officerAssignment.deleteMany({ where: { positionId: chairmanPosition.id } });
  await prisma.officerAssignment.create({
    data: {
      positionId: chairmanPosition.id,
      memberId: alphaMember.id,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        id: "ci-alpha-public-announcement",
        chapterId: "ci-chapter-alpha",
        audience: "CHAPTER",
        title: "CI Alpha Public Update",
        body: "This announcement is explicitly approved for the public PSP website.",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        isPublic: true,
      },
      {
        id: "ci-alpha-private-announcement",
        chapterId: "ci-chapter-alpha",
        audience: "CHAPTER",
        title: "CI Alpha Private Update",
        body: "This member-only announcement must never appear on the public PSP website.",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        isPublic: false,
      },
    ],
  });

  await prisma.event.create({
    data: {
      id: "ci-alpha-public-event",
      chapterId: "ci-chapter-alpha",
      audience: "CHAPTER",
      title: "CI Alpha Published Event",
      description: "Published Chapter event for the public homepage regression contract.",
      venue: "CI Test Venue",
      startsAt: new Date("2026-09-20T08:00:00.000Z"),
      isPublished: true,
      status: "PUBLISHED",
    },
  });

  console.log(JSON.stringify({
    chairmanPositionId: chairmanPosition.id,
    chairmanMemberId: alphaMember.id,
    paymentConfigReset: true,
    publicAnnouncementId: "ci-alpha-public-announcement",
    privateAnnouncementId: "ci-alpha-private-announcement",
    publicEventId: "ci-alpha-public-event",
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
