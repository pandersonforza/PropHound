import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["Submitted", "Under Review", "Accepted", "Rejected"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const bid = await prisma.bid.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(bid);
  } catch {
    return NextResponse.json({ error: "Failed to update bid status" }, { status: 500 });
  }
}
