import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const drawRequest = await prisma.drawRequest.findUnique({ where: { id } });
    if (!drawRequest) {
      return NextResponse.json(
        { error: 'Draw request not found' },
        { status: 404 }
      );
    }

    const lineItems = await prisma.drawLineItem.findMany({
      where: { drawRequestId: id },
      include: {
        budgetLineItem: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json(lineItems);
  } catch (error) {
    console.error('Failed to fetch draw line items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draw line items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const drawRequest = await prisma.drawRequest.findUnique({ where: { id } });
    if (!drawRequest) {
      return NextResponse.json(
        { error: 'Draw request not found' },
        { status: 404 }
      );
    }

    if (drawRequest.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Can only add line items to draft draw requests' },
        { status: 400 }
      );
    }

    const { budgetLineItemId, thisDrawAmount } = body;

    if (!budgetLineItemId || thisDrawAmount == null) {
      return NextResponse.json(
        { error: 'Missing required fields: budgetLineItemId, thisDrawAmount' },
        { status: 400 }
      );
    }

    if (typeof thisDrawAmount !== 'number' || thisDrawAmount <= 0) {
      return NextResponse.json(
        { error: 'thisDrawAmount must be a positive number' },
        { status: 400 }
      );
    }

    const budgetLineItem = await prisma.budgetLineItem.findUnique({
      where: { id: budgetLineItemId },
    });

    if (!budgetLineItem) {
      return NextResponse.json(
        { error: 'Budget line item not found' },
        { status: 404 }
      );
    }

    // Calculate previous draws for this budget line item
    const previousDrawLineItems = await prisma.drawLineItem.findMany({
      where: {
        budgetLineItemId,
        drawRequest: {
          status: { in: ['Submitted', 'Approved', 'Funded'] },
        },
      },
      select: { thisDrawAmount: true },
    });

    const previousDrawsTotal = previousDrawLineItems.reduce(
      (sum, item) => sum + item.thisDrawAmount,
      0
    );

    // Also include pending draw line items from other draft requests for this same budget line item
    const pendingDrawLineItems = await prisma.drawLineItem.findMany({
      where: {
        budgetLineItemId,
        drawRequestId: { not: id },
        drawRequest: { status: 'Draft' },
      },
      select: { thisDrawAmount: true },
    });

    const pendingTotal = pendingDrawLineItems.reduce(
      (sum, item) => sum + item.thisDrawAmount,
      0
    );

    const remaining = budgetLineItem.revisedBudget - budgetLineItem.actualCost - previousDrawsTotal - pendingTotal;

    if (thisDrawAmount > remaining) {
      return NextResponse.json(
        {
          error: `thisDrawAmount ($${thisDrawAmount.toLocaleString()}) exceeds remaining budget ($${remaining.toLocaleString()}) for this line item`,
        },
        { status: 400 }
      );
    }

    const drawLineItem = await prisma.drawLineItem.create({
      data: {
        drawRequestId: id,
        budgetLineItemId,
        currentAmount: budgetLineItem.revisedBudget,
        previousDraws: previousDrawsTotal,
        thisDrawAmount,
      },
      include: {
        budgetLineItem: {
          include: { category: true },
        },
      },
    });

    // Update draw request total amount
    const allLineItems = await prisma.drawLineItem.findMany({
      where: { drawRequestId: id },
      select: { thisDrawAmount: true },
    });
    const newTotal = allLineItems.reduce((sum, item) => sum + item.thisDrawAmount, 0);

    await prisma.drawRequest.update({
      where: { id },
      data: { totalAmount: newTotal },
    });

    return NextResponse.json(drawLineItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create draw line item:', error);
    return NextResponse.json(
      { error: 'Failed to create draw line item' },
      { status: 500 }
    );
  }
}
