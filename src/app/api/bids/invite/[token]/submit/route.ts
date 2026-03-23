import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await prisma.bidInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
    if (invitation.status !== "Open" || isExpired) {
      return NextResponse.json({ error: "This bid link is no longer active" }, { status: 400 });
    }

    const body = await request.json();
    const { gcCompany, gcName, gcEmail, gcPhone, notes, lineItems } = body;

    if (!gcCompany || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Company name and at least one line item are required" },
        { status: 400 }
      );
    }

    const totalAmount = lineItems.reduce(
      (sum: number, li: { amount: number }) => sum + (li.amount || 0),
      0
    );

    const bid = await prisma.bid.create({
      data: {
        invitationId: invitation.id,
        projectId: invitation.projectId,
        gcCompany,
        gcName: gcName || null,
        gcEmail: gcEmail || null,
        gcPhone: gcPhone || null,
        totalAmount,
        notes: notes || null,
        lineItems: {
          create: lineItems.map((li: { description: string; amount: number; category?: string }) => ({
            description: li.description,
            amount: li.amount,
            category: li.category || null,
          })),
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit bid" }, { status: 500 });
  }
}
