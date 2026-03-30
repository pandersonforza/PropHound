import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Debug + fix: lists all non-zero actuals in H7B CA0003, then zeros any Civil line item found.
export async function GET() {
  const project = await prisma.project.findFirst({
    where: { name: { contains: "CA0003" } },
    select: { id: true, name: true },
  });

  if (!project) {
    // Return all project names so we can see the exact name
    const allProjects = await prisma.project.findMany({ select: { id: true, name: true } });
    return NextResponse.json({ error: "Project CA0003 not found", allProjects }, { status: 404 });
  }

  // List every line item in this project with its current actualCost
  const lineItems = await prisma.budgetLineItem.findMany({
    where: { category: { projectId: project.id } },
    select: { id: true, description: true, actualCost: true },
    orderBy: { description: "asc" },
  });

  // Zero out any line item whose description contains "civil" (case-insensitive)
  const civilItems = lineItems.filter((li) =>
    li.description.toLowerCase().includes("civil")
  );

  for (const li of civilItems) {
    await prisma.budgetLineItem.update({
      where: { id: li.id },
      data: { actualCost: 0 },
    });
  }

  return NextResponse.json({
    project: project.name,
    civilItemsZeroed: civilItems.map((li) => ({ description: li.description, before: li.actualCost })),
    allLineItemsWithActuals: lineItems.filter((li) => li.actualCost > 0),
  });
}
