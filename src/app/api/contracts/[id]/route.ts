import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function recalculateCommittedCost(lineItemId: string) {
  const contracts = await prisma.contract.findMany({
    where: {
      lineItemId,
      status: { in: ['Executed', 'In Progress'] },
    },
    select: { amount: true },
  });

  const committedCost = contracts.reduce((sum, c) => sum + c.amount, 0);

  await prisma.budgetLineItem.update({
    where: { id: lineItemId },
    data: { committedCost },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: true,
        lineItem: {
          include: { category: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Failed to fetch contract:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    if (body.lineItemId !== undefined && body.lineItemId !== null) {
      const lineItem = await prisma.budgetLineItem.findUnique({ where: { id: body.lineItemId } });
      if (!lineItem) {
        return NextResponse.json({ error: 'Budget line item not found' }, { status: 404 });
      }
    }

    const oldLineItemId = existing.lineItemId;
    const newLineItemId = body.lineItemId !== undefined ? body.lineItemId : existing.lineItemId;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(body.vendorId !== undefined && { vendorId: body.vendorId }),
        ...(body.lineItemId !== undefined && { lineItemId: body.lineItemId }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      },
      include: {
        vendor: true,
        lineItem: true,
      },
    });

    // Recalculate committedCost on affected line items
    const lineItemsToRecalc = new Set<string>();
    if (oldLineItemId) lineItemsToRecalc.add(oldLineItemId);
    if (newLineItemId) lineItemsToRecalc.add(newLineItemId);

    for (const lineItemId of lineItemsToRecalc) {
      await recalculateCommittedCost(lineItemId);
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Failed to update contract:', error);
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    const lineItemId = existing.lineItemId;

    await prisma.contract.delete({ where: { id } });

    if (lineItemId) {
      await recalculateCommittedCost(lineItemId);
    }

    return NextResponse.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Failed to delete contract:', error);
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    );
  }
}
