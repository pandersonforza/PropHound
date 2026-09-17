import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CloseoutItem {
  category: string;
  title: string;
  completed: boolean;
  assignee: { name: string } | null;
  dueDate: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface CloseoutPdfData {
  projectName: string;
  projectAddress: string | null;
  estimatedClosingDate: string | null;
  items: CloseoutItem[];
  printedAt: Date;
}

/** Replace Unicode punctuation with ASCII so pdf-lib's WinAnsi font doesn't choke. */
function safe(str: string): string {
  return str
    .replace(/[''ʼ]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, '--')
    .replace(/…/g, '...')
    .replace(/[^\x00-\xFF]/g, '?');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function generateCloseoutPdf(data: CloseoutPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth  = 612;
  const pageHeight = 792;
  const margin     = 50;
  const lh         = 18;
  const teal       = rgb(0.16, 0.6, 0.6);
  const dark       = rgb(0.1, 0.1, 0.1);
  const muted      = rgb(0.45, 0.45, 0.45);
  const green      = rgb(0.13, 0.64, 0.36);
  const boxGray    = rgb(0.75, 0.75, 0.75);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y    = pageHeight - margin;

  const draw = (
    str: string,
    x: number,
    yPos: number,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; right?: boolean }
  ) => {
    const s    = safe(str);
    const f    = opts?.bold ? fontBold : font;
    const sz   = opts?.size ?? 9;
    const xPos = opts?.right ? x - f.widthOfTextAtSize(s, sz) : x;
    page.drawText(s, { x: xPos, y: yPos, font: f, size: sz, color: opts?.color ?? dark });
  };

  const hline = (yPos: number, x1 = margin, x2 = pageWidth - margin, w = 0.5, c = rgb(0.82, 0.82, 0.82)) => {
    page.drawLine({ start: { x: x1, y: yPos }, end: { x: x2, y: yPos }, thickness: w, color: c });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 20) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // ── Page header ──────────────────────────────────────────────────────────
  draw('CLOSEOUT CHECKLIST', margin, y, { bold: true, size: 18, color: teal });
  const printed = `Printed ${data.printedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  draw(printed, pageWidth - margin, y, { size: 8, color: muted, right: true });
  y -= 10;
  hline(y, margin, pageWidth - margin, 1.5, teal);
  y -= 22;

  // Project info
  draw(safe(data.projectName), margin, y, { bold: true, size: 13 });
  y -= 16;
  if (data.projectAddress) {
    draw(safe(data.projectAddress), margin, y, { size: 9, color: muted });
    y -= 14;
  }
  if (data.estimatedClosingDate) {
    draw(`Estimated Closing: ${formatDate(data.estimatedClosingDate)}`, margin, y, { size: 9, color: muted });
    y -= 14;
  }

  // Progress summary
  const total     = data.items.length;
  const completed = data.items.filter((i) => i.completed).length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  draw(`${completed} of ${total} items complete (${pct}%)`, margin, y, { size: 9, color: pct === 100 ? green : muted });
  y -= 20;
  hline(y);
  y -= 20;

  // ── Categories & items ───────────────────────────────────────────────────
  const categories = Array.from(new Set(data.items.map((i) => i.category)));

  for (const category of categories) {
    const catItems = data.items.filter((i) => i.category === category);
    const catDone  = catItems.filter((i) => i.completed).length;

    ensureSpace(lh + 14);

    // Category header band
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: pageWidth - margin * 2,
      height: lh + 4,
      color: rgb(0.94, 0.96, 0.96),
    });

    const catLabel = category.replace(/^\d+\.\s*/, '');
    draw(catLabel, margin + 6, y + 2, { bold: true, size: 9 });
    draw(`${catDone}/${catItems.length}`, pageWidth - margin - 4, y + 2, { size: 8, color: muted, right: true });
    y -= lh + 8;

    for (const item of catItems) {
      ensureSpace(lh + (item.notes ? 12 : 0) + 4);

      const boxSize = 8;
      const boxX    = margin + 2;
      const boxY    = y - 1;

      // Checkbox
      page.drawRectangle({ x: boxX, y: boxY, width: boxSize, height: boxSize, borderColor: item.completed ? green : boxGray, borderWidth: 1 });
      if (item.completed) {
        // Checkmark
        page.drawLine({ start: { x: boxX + 1.5, y: boxY + 4 }, end: { x: boxX + 3.5, y: boxY + 2 }, thickness: 1.2, color: green });
        page.drawLine({ start: { x: boxX + 3.5, y: boxY + 2 }, end: { x: boxX + 7,   y: boxY + 7 }, thickness: 1.2, color: green });
      }

      // Title
      const titleColor = item.completed ? muted : dark;
      draw(safe(item.title), margin + 16, y, { size: 9, color: titleColor });

      // Right-aligned meta: assignee + due date
      const meta: string[] = [];
      if (item.assignee?.name) meta.push(safe(item.assignee.name));
      if (item.dueDate)       meta.push(formatDate(item.dueDate));
      if (meta.length) {
        draw(meta.join('  |  '), pageWidth - margin, y, { size: 8, color: muted, right: true });
      }

      y -= lh;

      // Notes
      if (item.notes?.trim()) {
        const noteLines = item.notes.trim().split('\n');
        for (const line of noteLines) {
          ensureSpace(12);
          draw(safe(line.trim()), margin + 20, y, { size: 7.5, color: muted });
          y -= 12;
        }
      }
    }

    y -= 8; // gap between categories
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
