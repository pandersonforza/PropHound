import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

interface ProcessedInvoice {
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  date: string;
  description: string;
  suggestedProjectId: string | null;
  suggestedBudgetLineItemId: string | null;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing required field: filePath' },
        { status: 400 }
      );
    }

    // Fetch PDF from blob URL or local path
    let pdfBuffer: Buffer;
    try {
      if (filePath.startsWith('http')) {
        // Vercel Blob private stores require a Bearer token to read server-side
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const res = await fetch(filePath, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status} ${res.statusText}`);
        pdfBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        const { readFile } = await import('fs/promises');
        const path = await import('path');
        const absolutePath = path.join(process.cwd(), 'public', filePath);
        pdfBuffer = await readFile(absolutePath);
      }
    } catch (fetchErr) {
      console.error('File fetch error:', fetchErr);
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
      return NextResponse.json(
        { error: `File not found: ${msg}` },
        { status: 404 }
      );
    }

    // Only fetch active projects — omit line items to keep the prompt under the 200k token limit
    const projects = await prisma.project.findMany({
      where: { status: 'Active' },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not set — returning mock response for testing');
      const mockResult: ProcessedInvoice = {
        vendorName: 'Sample Vendor LLC',
        invoiceNumber: 'INV-2024-001',
        amount: 5250.00,
        date: new Date().toISOString().split('T')[0],
        description: 'Construction materials and supplies',
        suggestedProjectId: projects.length > 0 ? projects[0].id : null,
        suggestedBudgetLineItemId: null,
        confidence: 0.45,
        reasoning: 'Mock response — ANTHROPIC_API_KEY not configured. Set the environment variable to enable AI-powered invoice processing.',
      };
      return NextResponse.json({ invoices: [mockResult] });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const base64Pdf = pdfBuffer.toString('base64');

    const projectContext = projects
      .map((p) => `  - ID: "${p.id}" | Name: "${p.name}"${p.address ? ` | Address: "${p.address}"` : ''}`)
      .join('\n');

    const systemPrompt = `You are an expert invoice processing assistant for a real estate development company. Your job is to analyze invoice PDFs and extract structured data.

Here are the active projects (match by name or address if the invoice references one):

${projectContext || '  (No active projects)'}

Analyze the provided PDF. It may contain ONE or MULTIPLE invoices. Carefully check for page breaks, different vendor names, different invoice numbers, or other indicators that separate invoices exist within the document.

Return ONLY valid JSON with no additional text or markdown formatting.

Required JSON structure — ALWAYS return an object with an "invoices" array, even for a single invoice:
{
  "invoices": [
    {
      "vendorName": "string - the vendor/company name on the invoice",
      "invoiceNumber": "string or null - the invoice number if present",
      "amount": number - the total amount due (numeric, no currency symbols),
      "date": "string - invoice date in YYYY-MM-DD format",
      "description": "string - brief description of goods/services",
      "suggestedProjectId": "string or null - the ID of the best matching project from the list above",
      "suggestedBudgetLineItemId": null,
      "confidence": number between 0 and 1 - how confident you are in the project match,
      "reasoning": "string - brief explanation of your project match (or why no match)"
    }
  ]
}

Guidelines:
- If the PDF contains multiple invoices (different vendors, invoice numbers, or clearly separated sections), extract EACH one as a separate entry in the array.
- Match to a project if the invoice references a job site address, project name, or other identifiable detail.
- If no project match exists, set suggestedProjectId to null with low confidence.
- Always extract vendorName, amount, and date even if you cannot match to a project.
- For the date, use the invoice date (not due date or payment date).
- For the amount, use the total amount due (including tax if shown).`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: 'Extract all invoices from this PDF and return the JSON response.',
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;

    if (!textBlock) {
      return NextResponse.json(
        { error: 'No text response received from AI' },
        { status: 502 }
      );
    }

    let jsonText = textBlock.text.trim();

    // Strip markdown code fences if the model wrapped the JSON
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let parsed: { invoices?: ProcessedInvoice[] } & Partial<ProcessedInvoice>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('Failed to parse AI response as JSON:', jsonText);
      return NextResponse.json(
        { error: 'Failed to parse AI response. The model did not return valid JSON.' },
        { status: 502 }
      );
    }

    // Normalize: always return { invoices: [...] }
    let invoices: ProcessedInvoice[];
    if (Array.isArray(parsed.invoices)) {
      invoices = parsed.invoices;
    } else if (parsed.vendorName) {
      // Single invoice returned as flat object (backward compat)
      invoices = [parsed as ProcessedInvoice];
    } else {
      return NextResponse.json(
        { error: 'AI response is missing required fields.' },
        { status: 502 }
      );
    }

    // Validate each invoice has the required fields
    for (const inv of invoices) {
      if (!inv.vendorName || inv.amount === undefined || !inv.date) {
        return NextResponse.json(
          { error: 'AI response is missing required fields (vendorName, amount, date) on one or more invoices.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Failed to process invoice:', error);
    // Surface the actual error so the UI can display it instead of showing blank fields
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as { status?: number })?.status;
    return NextResponse.json(
      { error: `AI processing failed: ${message}` },
      { status: statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
