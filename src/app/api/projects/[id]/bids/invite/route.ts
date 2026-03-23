import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { gcCompany, gcEmail, gcName } = body as {
      gcCompany?: string;
      gcEmail?: string;
      gcName?: string;
    };

    const invitation = await prisma.bidInvitation.create({
      data: {
        projectId: id,
        gcCompany: gcCompany || null,
        gcEmail: gcEmail || null,
        gcName: gcName || null,
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
