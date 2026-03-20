import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const categories = await prisma.budgetCategory.findMany({
      where: { projectId },
      include: {
        lineItems: true,
      },
      orderBy: { categoryGroup: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to fetch budget categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { projectId, name, categoryGroup } = body;

    if (!projectId || !name || !categoryGroup) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, categoryGroup' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const category = await prisma.budgetCategory.create({
      data: {
        projectId,
        name,
        categoryGroup,
      },
      include: {
        lineItems: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Failed to create budget category:', error);
    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    );
  }
}
