import { NextResponse } from "next/server";
import { generateMembershipCertificatePdf } from "@/lib/certificates/generator";
import { getAuthContext, hasPermission } from "@/lib/auth/context";
import { getCurrentChapterChairman } from "@/lib/chapter/chairman";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        chapter: { select: { name: true } },
        member: { select: { id: true, firstName: true, middleInitial: true, lastName: true, membershipNo: true } },
      },
    });
    if (!certificate) return NextResponse.json({ message: "Certificate not found." }, { status: 404 });

    const owner = context.user.member?.id === certificate.memberId;
    const manager = hasPermission(context, "certificates.manage", certificate.chapterId);
    if (!owner && !manager) return NextResponse.json({ message: "Access denied." }, { status: 403 });

    let signatoryName = certificate.signatoryName;
    let signatoryTitle = certificate.signatoryTitle;
    if (!signatoryName || !signatoryTitle) {
      const chairman = await getCurrentChapterChairman(certificate.chapterId);
      if (!chairman) {
        return NextResponse.json(
          { message: "Chapter Chairman signatory is not configured for this certificate." },
          { status: 409 },
        );
      }
      signatoryName = chairman.name;
      signatoryTitle = chairman.title;
    }

    const memberName = [certificate.member.firstName, certificate.member.middleInitial, certificate.member.lastName]
      .filter(Boolean)
      .join(" ");
    const pdf = await generateMembershipCertificatePdf({
      memberName,
      membershipNo: certificate.member.membershipNo,
      chapterName: certificate.chapter.name,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      verificationToken: certificate.verificationToken,
      signatoryName,
      signatoryTitle,
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificateNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Certificate PDF error", error);
    return NextResponse.json({ message: "Unable to generate certificate." }, { status: 500 });
  }
}
