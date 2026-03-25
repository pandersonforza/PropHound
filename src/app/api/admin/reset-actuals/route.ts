import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { projectId, categoryGroup } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const categories = await prisma.budgetCategory.findMany({
      where: {
        projectId,
        ...(categoryGroup ? { categoryGroup } : {}),
      },
      select: { id: true },
    });

    const categoryIds = categories.map((c) => c.id);

    const result = await prisma.budgetLineItem.updateMany({
      where: { categoryId: { in: categoryIds } },
      data: { actualCost: 0 },
    });

    return NextResponse.json({
      message: `Reset ${result.count} line items to 0`,
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to reset actuals:", error);
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
}
