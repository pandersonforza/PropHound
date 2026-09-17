import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateCloseoutPdf } from '@/lib/generate-closeout-pdf';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const [project, items] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, address: true, estimatedClosingDate: true },
      }),
      prisma.closeoutItem.findMany({
        where: { projectId },
        include: { assignee: { select: { name: true } } },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const pdfBuffer = await generateCloseoutPdf({
      projectName: project.name,
      projectAddress: project.address ?? null,
      estimatedClosingDate: project.estimatedClosingDate
        ? project.estimatedClosingDate.toISOString().slice(0, 10)
        : null,
      items: items.map((i) => ({
        category:  i.category,
        title:     i.title,
        completed: i.completed,
        assignee:  i.assignee ? { name: i.assignee.name } : null,
        dueDate:   i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null,
        notes:     i.notes ?? null,
        sortOrder: i.sortOrder,
      })),
      printedAt: new Date(),
    });

    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="Closeout_${safeName}.pdf"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate closeout PDF:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
