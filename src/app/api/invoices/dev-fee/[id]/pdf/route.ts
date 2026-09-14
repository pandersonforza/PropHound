import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDevFeePdf } from '@/lib/generate-dev-fee-pdf';

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        invoiceNumber: true,
        vendorName: true,
        amount: true,
        date: true,
        aiNotes: true,
        project: { select: { name: true, address: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfBuffer = await generateDevFeePdf(invoice);

    const filename = `DevFeeInvoice_${invoice.invoiceNumber ?? id}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate dev fee invoice PDF:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
