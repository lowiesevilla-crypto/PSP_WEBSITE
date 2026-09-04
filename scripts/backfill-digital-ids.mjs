import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    where: {
      membershipStatus: "ACTIVE",
      digitalId: null,
    },
    select: { id: true },
  });

  for (const member of members) {
    await prisma.digitalMemberId.upsert({
      where: { memberId: member.id },
      update: {},
      create: {
        memberId: member.id,
        verificationToken: randomBytes(24).toString("base64url"),
        status: "VALID",
      },
    });
  }

  console.log(`Digital member ID baseline verified for ${members.length} member(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
