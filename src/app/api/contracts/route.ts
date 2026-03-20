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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        vendor: true,
        project: true,
        lineItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { projectId, vendorId, title, amount, type, startDate } = body;

    if (!projectId || !vendorId || !title || amount == null || !type || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, vendorId, title, amount, type, startDate' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'amount must be a non-negative number' },
        { status: 400 }
      );
    }

    const [project, vendor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (body.lineItemId) {
      const lineItem = await prisma.budgetLineItem.findUnique({ where: { id: body.lineItemId } });
      if (!lineItem) {
        return NextResponse.json({ error: 'Budget line item not found' }, { status: 404 });
      }
    }

    const contract = await prisma.contract.create({
      data: {
        projectId,
        vendorId,
        lineItemId: body.lineItemId ?? null,
        title,
        amount,
        type,
        status: body.status ?? 'Draft',
        startDate: new Date(startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
      include: {
        vendor: true,
        lineItem: true,
      },
    });

    if (contract.lineItemId && ['Executed', 'In Progress'].includes(contract.status)) {
      await recalculateCommittedCost(contract.lineItemId);
    }

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Failed to create contract:', error);
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    );
  }
}
