import { NextRequest, NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDevFeePdf } from '@/lib/generate-dev-fee-pdf';

export const maxDuration = 60;

/** Sanitize a string for use as a filename. */
function safeFilename(str: string): string {
  return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { invoiceIds: string[] };
    const { invoiceIds } = body;

    if (!invoiceIds?.length) {
      return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        invoiceNumber: true,
        vendorName: true,
        amount: true,
        date: true,
        filePath: true,
        aiNotes: true,
        project: { select: { name: true, address: true } },
      },
      orderBy: { date: 'asc' },
    });

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Collect files for the ZIP: { filename: Uint8Array }
    const zipFiles: Record<string, Uint8Array> = {};

    // Track base names to avoid collisions
    const seen = new Map<string, number>();

    for (const invoice of invoices) {
      let pdfData: Uint8Array | null = null;

      if (invoice.invoiceNumber?.startsWith('DF-')) {
        // Generate dev fee PDF on the fly
        try {
          const buf = await generateDevFeePdf(invoice);
          pdfData = new Uint8Array(buf);
        } catch (err) {
          console.error(`Failed to generate PDF for invoice ${invoice.id}:`, err);
          continue;
        }
      } else if (invoice.filePath?.startsWith('http')) {
        // Fetch stored PDF from Vercel Blob
        try {
          const res = await fetch(invoice.filePath, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            pdfData = new Uint8Array(await res.arrayBuffer());
          }
        } catch (err) {
          console.error(`Failed to fetch PDF for invoice ${invoice.id}:`, err);
          continue;
        }
      }

      if (!pdfData) continue;

      // Build a readable filename: "VendorName - INV-0001.pdf"
      const parts = [safeFilename(invoice.vendorName ?? 'Invoice')];
      if (invoice.invoiceNumber) parts.push(safeFilename(invoice.invoiceNumber));
      const base = parts.join(' - ');

      // Deduplicate
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const filename = count === 0 ? `${base}.pdf` : `${base} (${count}).pdf`;

      zipFiles[filename] = pdfData;
    }

    if (Object.keys(zipFiles).length === 0) {
      return NextResponse.json({ error: 'No PDFs could be generated for the selected invoices' }, { status: 404 });
    }

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const folderName = `invoices_${dateStr}`;

    // Put all files inside a dated folder within the zip
    const foldered: Record<string, Uint8Array> = {};
    for (const [name, data] of Object.entries(zipFiles)) {
      foldered[`${folderName}/${name}`] = data;
    }

    const zipped = zipSync(foldered, { level: 6 });

    return new NextResponse(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate invoice ZIP:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
