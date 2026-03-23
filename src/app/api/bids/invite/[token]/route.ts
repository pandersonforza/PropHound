import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await prisma.bidInvitation.findUnique({
      where: { token },
      include: { project: { select: { name: true, address: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
    const isActive = invitation.status === "Open" && !isExpired;

    return NextResponse.json({
      projectName: invitation.project.name,
      projectAddress: invitation.project.address,
      status: isActive ? "Open" : "Closed",
      gcCompany: invitation.gcCompany,
      gcName: invitation.gcName,
      gcEmail: invitation.gcEmail,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch invitation" }, { status: 500 });
  }
}
