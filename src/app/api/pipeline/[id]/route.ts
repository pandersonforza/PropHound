import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.pipelineProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch pipeline project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const project = await prisma.pipelineProject.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to update pipeline project:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.pipelineProject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete pipeline project:', error);
    return NextResponse.json(
      { error: 'Failed to delete pipeline project' },
      { status: 500 }
    );
  }
}
