import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface LineItemInput {
  description: string;
  originalBudget: number;
  revisedBudget: number;
}

interface CategoryInput {
  name: string;
  categoryGroup: string;
  lineItems: LineItemInput[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, categories, clearExisting } = body as {
      projectId: string;
      categories: CategoryInput[];
      clearExisting: boolean;
    };

    if (!projectId || !categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and categories' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        // Delete existing line items and categories for this project
        const existingCategories = await tx.budgetCategory.findMany({
          where: { projectId },
          select: { id: true },
        });
        const categoryIds = existingCategories.map((c) => c.id);

        if (categoryIds.length > 0) {
          await tx.budgetLineItem.deleteMany({
            where: { categoryId: { in: categoryIds } },
          });
          await tx.budgetCategory.deleteMany({
            where: { projectId },
          });
        }
      }

      // Create new categories with line items
      for (const cat of categories) {
        await tx.budgetCategory.create({
          data: {
            projectId,
            name: cat.name,
            categoryGroup: cat.categoryGroup,
            lineItems: {
              create: cat.lineItems.map((li) => ({
                description: li.description,
                originalBudget: li.originalBudget,
                revisedBudget: li.revisedBudget,
                committedCost: 0,
                actualCost: 0,
              })),
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save budget:', error);
    return NextResponse.json(
      { error: 'Failed to save budget' },
      { status: 500 }
    );
  }
}
