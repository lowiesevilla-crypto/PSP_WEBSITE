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

  console.log(JSON.stringify({
    chairmanPositionId: chairmanPosition.id,
    chairmanMemberId: alphaMember.id,
    paymentConfigReset: true,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
