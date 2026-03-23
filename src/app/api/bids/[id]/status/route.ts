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
      include: { lineItems: true },
    });

    // When a bid is accepted, add line items as committed costs in the budget
    if (status === "Accepted") {
      await addBidToBudget(bid.projectId, bid.lineItems);
    }

    return NextResponse.json(bid);
  } catch {
    return NextResponse.json({ error: "Failed to update bid status" }, { status: 500 });
  }
}

async function addBidToBudget(
  projectId: string,
  bidLineItems: { description: string; amount: number; category: string | null }[]
) {
  // Group bid line items by category
  const byCategory = new Map<string, { description: string; amount: number }[]>();
  for (const li of bidLineItems) {
    const cat = li.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push({ description: li.description, amount: li.amount });
  }

  for (const [categoryName, items] of byCategory) {
    // Find or create the budget category
    let category = await prisma.budgetCategory.findFirst({
      where: { projectId, name: categoryName },
    });

    if (!category) {
      category = await prisma.budgetCategory.create({
        data: {
          projectId,
          name: categoryName,
          categoryGroup: "Hard Costs",
        },
      });
    }

    // For each bid line item, find or create a matching budget line item
    for (const item of items) {
      const existing = await prisma.budgetLineItem.findFirst({
        where: { categoryId: category.id, description: item.description },
      });

      if (existing) {
        // Add the bid amount to existing committed cost
        await prisma.budgetLineItem.update({
          where: { id: existing.id },
          data: { committedCost: existing.committedCost + item.amount },
        });
      } else {
        // Create new budget line item with the bid amount as committed
        await prisma.budgetLineItem.create({
          data: {
            categoryId: category.id,
            description: item.description,
            originalBudget: 0,
            revisedBudget: 0,
            committedCost: item.amount,
            actualCost: 0,
          },
        });
      }
    }
  }
}
