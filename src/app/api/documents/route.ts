import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        project: true,
      },
      orderBy: { uploadDate: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { projectId, name, category } = body;

    if (!projectId || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, category' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        name,
        category,
        uploadDate: body.uploadDate ? new Date(body.uploadDate) : new Date(),
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
