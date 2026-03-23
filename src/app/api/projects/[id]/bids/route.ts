import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [bids, invitations] = await Promise.all([
      prisma.bid.findMany({
        where: { projectId: id },
        include: { lineItems: true, invitation: true },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.bidInvitation.findMany({
        where: { projectId: id },
        include: { _count: { select: { bids: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ bids, invitations });
  } catch {
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }
}
