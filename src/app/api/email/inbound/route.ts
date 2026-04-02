import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export const maxDuration = 300;

const APPROVER_EMAIL = 'panderson@forzacommercial.com';
const BOT_SUBMITTER_NAME = 'Invoices';

// Optional: verify that the request comes from Postmark by checking a shared secret
// Set POSTMARK_WEBHOOK_SECRET in Vercel env vars and configure it in Postmark webhook settings
function verifyPostmarkSecret(request: NextRequest): boolean {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured — allow (set one in production)
  return request.headers.get('x-webhook-secret') === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyPostmarkSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    // Postmark inbound email payload structure:
    // { From, Subject, Attachments: [{ Name, Content (base64), ContentType, ContentLength }] }
    const attachments: Array<{ Name: string; Content: string; ContentType: string }> =
      payload.Attachments ?? [];

    const pdfAttachments = attachments.filter(
      (a) => a.ContentType === 'application/pdf' || a.Name?.toLowerCase().endsWith('.pdf')
    );

    if (pdfAttachments.length === 0) {
      return NextResponse.json({ message: 'No PDF attachments found, skipping' }, { status: 200 });
    }

    // Look up the approver at runtime
    const approver = await prisma.user.findUnique({
      where: { email: APPROVER_EMAIL },
      select: { id: true, name: true },
    });

    if (!approver) {
      console.error(`Approver not found: ${APPROVER_EMAIL}`);
      return NextResponse.json({ error: 'Approver not found' }, { status: 500 });
    }

    const results = [];

    for (const attachment of pdfAttachments) {
      try {
        const pdfBuffer = Buffer.from(attachment.Content, 'base64');
        const filename = attachment.Name || `invoice-${Date.now()}.pdf`;

        // Upload to Vercel Blob
        const blob = await put(`invoices/${Date.now()}-${filename}`, pdfBuffer, {
          access: 'public',
          contentType: 'application/pdf',
        });

        // Run AI processing pipeline
        const processRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: blob.url }),
        });

        if (!processRes.ok) {
          console.error('AI processing failed for', filename);
          results.push({ filename, status: 'ai_failed' });
          continue;
        }

        const { invoices: processedInvoices } = await processRes.json() as {
          invoices: Array<{
            vendorName: string;
            invoiceNumber: string | null;
            amount: number;
            date: string;
            description: string;
            suggestedProjectId: string | null;
            suggestedBudgetLineItemId: string | null;
            confidence: number;
            reasoning: string;
          }>;
        };

        for (const inv of processedInvoices) {
          const hasGoodMatch = inv.confidence >= 0.6 && inv.suggestedProjectId && inv.suggestedBudgetLineItemId;

          const invoice = await prisma.invoice.create({
            data: {
              vendorName: inv.vendorName,
              amount: inv.amount,
              date: new Date(inv.date),
              filePath: blob.url,
              invoiceNumber: inv.invoiceNumber ?? null,
              description: inv.description ?? null,
              aiConfidence: inv.confidence,
              aiNotes: inv.reasoning,
              submittedBy: BOT_SUBMITTER_NAME,
              projectId: hasGoodMatch ? inv.suggestedProjectId : null,
              budgetLineItemId: hasGoodMatch ? inv.suggestedBudgetLineItemId : null,
              approver: approver.name,
              approverId: approver.id,
              status: 'Submitted',
              submittedDate: new Date(),
            },
          });

          results.push({ filename, invoiceId: invoice.id, status: 'submitted' });
        }
      } catch (err) {
        console.error('Error processing attachment', attachment.Name, err);
        results.push({ filename: attachment.Name, status: 'error' });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
