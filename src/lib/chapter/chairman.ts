import { prisma } from "@/lib/prisma";

const CHAIRMAN_CODES = [
  "CHAIRMAN",
  "CHAPTER_CHAIRMAN",
  "CHAIRPERSON",
  "CHAPTER_CHAIRPERSON",
];

export async function getCurrentChapterChairman(chapterId: string) {
  const now = new Date();
  const assignment = await prisma.officerAssignment.findFirst({
    where: {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      position: {
        chapterId,
        isActive: true,
        OR: [
          { code: { in: CHAIRMAN_CODES } },
          { name: { contains: "Chairman" } },
          { name: { contains: "Chairperson" } },
        ],
      },
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    include: {
      position: { select: { name: true, code: true } },
      member: {
        select: {
          id: true,
          firstName: true,
          middleInitial: true,
          lastName: true,
          membershipNo: true,
        },
      },
    },
  });

  if (!assignment) return null;

  return {
    assignmentId: assignment.id,
    memberId: assignment.member.id,
    name: [
      assignment.member.firstName,
      assignment.member.middleInitial,
      assignment.member.lastName,
    ]
      .filter(Boolean)
      .join(" "),
    title: assignment.position.name || "Chapter Chairman",
    membershipNo: assignment.member.membershipNo,
  };
}
