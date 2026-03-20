import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

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

    const absolutePath = path.join(process.cwd(), 'public', filePath);
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await readFile(absolutePath);
    } catch {
      return NextResponse.json(
        { error: 'File not found. Please ensure the file has been uploaded.' },
        { status: 404 }
      );
    }

    const projects = await prisma.project.findMany({
      include: {
        budgetCategories: {
          include: {
            lineItems: true,
          },
        },
      },
    });

    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        category: true,
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
        suggestedBudgetLineItemId:
          projects.length > 0 &&
          projects[0].budgetCategories.length > 0 &&
          projects[0].budgetCategories[0].lineItems.length > 0
            ? projects[0].budgetCategories[0].lineItems[0].id
            : null,
        confidence: 0.45,
        reasoning: 'Mock response — ANTHROPIC_API_KEY not configured. Set the environment variable to enable AI-powered invoice processing.',
      };
      return NextResponse.json(mockResult);
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const base64Pdf = pdfBuffer.toString('base64');

    const projectContext = projects
      .map((p) => {
        const categories = p.budgetCategories
          .map((cat) => {
            const items = cat.lineItems
              .map((li) => `      - LineItem ID: "${li.id}" | Name: "${li.name}" | Budget: $${li.budgetAmount}`)
              .join('\n');
            return `    Category: "${cat.name}" (ID: "${cat.id}")\n${items}`;
          })
          .join('\n');
        return `  Project: "${p.name}" (ID: "${p.id}")\n${categories}`;
      })
      .join('\n\n');

    const vendorContext = vendors
      .map((v) => `  - "${v.name}" (Company: "${v.company}", Category: "${v.category}")`)
      .join('\n');

    const systemPrompt = `You are an expert invoice processing assistant for a real estate development company. Your job is to analyze invoice PDFs and extract structured data.

Here are the available projects and their budget line items:

${projectContext || '  (No projects available)'}

Here are the known vendors:

${vendorContext || '  (No vendors available)'}

Analyze the provided invoice PDF and extract the following information. Return ONLY valid JSON with no additional text or markdown formatting.

Required JSON structure:
{
  "vendorName": "string - the vendor/company name on the invoice",
  "invoiceNumber": "string or null - the invoice number if present",
  "amount": number - the total amount due (numeric, no currency symbols),
  "date": "string - invoice date in YYYY-MM-DD format",
  "description": "string - brief description of goods/services",
  "suggestedProjectId": "string or null - the ID of the best matching project from the list above",
  "suggestedBudgetLineItemId": "string or null - the ID of the best matching budget line item from the list above",
  "confidence": number between 0 and 1 - how confident you are in the project/line item match,
  "reasoning": "string - brief explanation of why you chose this project and line item"
}

Guidelines:
- Match vendors to known vendors when possible (fuzzy matching on name/company).
- Match to projects and line items based on the description, vendor category, and amount.
- If no good match exists, set suggestedProjectId and suggestedBudgetLineItemId to null with low confidence.
- Always extract vendorName, amount, and date even if you cannot match to a project.
- For the date, use the invoice date (not due date or payment date).
- For the amount, use the total amount due (including tax if shown).`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
              text: systemPrompt,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response received from AI' },
        { status: 502 }
      );
    }

    let jsonText = textBlock.text.trim();

    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let result: ProcessedInvoice;
    try {
      result = JSON.parse(jsonText);
    } catch {
      console.error('Failed to parse AI response as JSON:', jsonText);
      return NextResponse.json(
        { error: 'Failed to parse AI response. The model did not return valid JSON.' },
        { status: 502 }
      );
    }

    if (!result.vendorName || result.amount === undefined || !result.date) {
      return NextResponse.json(
        { error: 'AI response is missing required fields (vendorName, amount, date).' },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to process invoice:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice' },
      { status: 500 }
    );
  }
}
