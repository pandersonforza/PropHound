import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'Submitted',
      },
      include: {
        project: true,
        lineItem: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { submittedDate: 'asc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Failed to fetch pending invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invoices' },
      { status: 500 }
    );
  }
}
