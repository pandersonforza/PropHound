"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Loader2, Upload, Download, FileText, CheckCircle, AlertCircle } from "lucide-react";
// xlsx is dynamically imported when needed to reduce bundle size
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface BudgetLineItem {
  id: string;
  description: string;
  revisedBudget: number;
  actualCost: number;
  categoryId: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  categoryGroup: string;
  lineItems: BudgetLineItem[];
}

interface PayAppFormItem {
  lineItemId: string;
  description: string;
  categoryName: string;
  budget: number;
  previouslyBilled: number;
  currentAmount: number;
}

interface PdfExtractedItem {
  description: string;
  grossAmount: number;       // raw "This Period" from Claude
  matchedLineItemId: string | null;
  manualLineItemId: string;
}

type Step = "form" | "saving";

interface PayAppEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onSuccess: () => void;
}

// Normalize a string for comparison: lowercase, strip punctuation, then collapse whitespace
const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

export function PayAppEntry({ open, onOpenChange, projectId, onSuccess }: PayAppEntryProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [gcCompany, setGcCompany] = useState("");
  const [appNumber, setAppNumber] = useState("");
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<PayAppFormItem[]>([]);
  const [approverId, setApproverId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfItems, setPdfItems] = useState<PdfExtractedItem[]>([]);
  const [retainagePct, setRetainagePct] = useState(10);
  const [changeOrderAmount, setChangeOrderAmount] = useState(0);
  const [coLineItemId, setCoLineItemId] = useState<string | null>(null);
  const [hardCostCategoryId, setHardCostCategoryId] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Required pay app PDF attachment
  const [requiredPdfFile, setRequiredPdfFile] = useState<File | null>(null);
  const [requiredPdfUrl, setRequiredPdfUrl] = useState("");
  const [requiredPdfUploading, setRequiredPdfUploading] = useState(false);
  const requiredPdfRef = useRef<HTMLInputElement>(null);

  // Download a blank template with line item descriptions
  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const rows = items.map((item) => ({
      "Line Item": item.description,
      "Category": item.categoryName,
      "Budget": item.budget,
      "Previously Billed": item.previouslyBilled,
      "This Period": 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pay App");
    XLSX.writeFile(wb, `PayApp_Template_${appNumber || "blank"}.xlsx`);
  };

  // Import from Excel — tries all sheets and multiple parsing strategies
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        const descKeywords = ["description", "line item", "lineitem", "item", "work", "trade", "scope", "cost code", "category"];
        const amtKeywords  = ["this period", "thisperiod", "amount", "billing", "current", "billed", "period", "draw"];

        // Attempt to extract matches from a sheet using raw rows (no header assumption).
        // Strategy A: scan first 20 rows for a header row, then use column indices.
        // Strategy B: scan every cell for a value matching a budget description, then
        //             find the best numeric value in that row.
        // Returns the list of { lineItemId, amount } pairs from whichever strategy wins.
        const parseSheet = (sheetName: string): { lineItemId: string; amount: number; usedSheet: string }[] => {
          const ws = wb.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
          if (rawRows.length < 2) return [];

          const toStr  = (v: unknown) => String(v ?? "").trim();
          const toNum  = (v: unknown) => parseFloat(toStr(v).replace(/[$,\s]/g, "")) || 0;

          // ── Strategy A: header-row detection ──────────────────────────────
          let stratAResults: { lineItemId: string; amount: number; usedSheet: string }[] = [];
          for (let hi = 0; hi < Math.min(20, rawRows.length - 1); hi++) {
            const headerRow = rawRows[hi].map(toStr);
            const descCol = headerRow.findIndex((h) => descKeywords.some((kw) => h.toLowerCase().includes(kw)));
            const amtCol  = headerRow.findIndex((h) => amtKeywords.some((kw) => h.toLowerCase().includes(kw)));
            if (descCol < 0 || amtCol < 0) continue;

            const results: { lineItemId: string; amount: number; usedSheet: string }[] = [];
            for (let ri = hi + 1; ri < rawRows.length; ri++) {
              const row = rawRows[ri];
              const descRaw = toStr(row[descCol]);
              const amount  = toNum(row[amtCol]);
              if (!descRaw || amount <= 0) continue;
              const dn = normalize(descRaw);
              const hit = items.find((it) => normalize(it.description) === dn)
                ?? items.find((it) => normalize(it.description).includes(dn) || dn.includes(normalize(it.description)));
              if (hit) results.push({ lineItemId: hit.lineItemId, amount, usedSheet: sheetName });
            }
            if (results.length > stratAResults.length) stratAResults = results;
          }

          // ── Strategy B: description-scan (no header needed) ───────────────
          // For every cell whose text matches a budget line item, find the best
          // numeric value in that row. Prefer the column that is most consistently
          // used across all matched rows.
          const rowHits: { lineItemId: string; rowIdx: number; numericCols: { col: number; val: number }[] }[] = [];
          for (let ri = 0; ri < rawRows.length; ri++) {
            const row = rawRows[ri];
            for (let ci = 0; ci < row.length; ci++) {
              const cellText = toStr(row[ci]);
              if (cellText.length < 3) continue;
              const dn = normalize(cellText);
              const hit = items.find((it) => normalize(it.description) === dn)
                ?? items.find((it) => {
                  const n = normalize(it.description);
                  return n.length > 4 && (n.includes(dn) || dn.includes(n));
                });
              if (!hit) continue;
              const numericCols = row
                .map((v, col) => ({ col, val: toNum(v) }))
                .filter(({ col, val }) => col !== ci && val > 0);
              if (numericCols.length > 0) rowHits.push({ lineItemId: hit.lineItemId, rowIdx: ri, numericCols });
              break; // only match one description per row
            }
          }

          // Pick the column index that appears most often across all row hits
          const colFreq = new Map<number, number>();
          for (const { numericCols } of rowHits) {
            for (const { col } of numericCols) colFreq.set(col, (colFreq.get(col) ?? 0) + 1);
          }
          const bestCol = [...colFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;

          const stratBResults: { lineItemId: string; amount: number; usedSheet: string }[] = [];
          for (const { lineItemId, numericCols } of rowHits) {
            const preferred = numericCols.find(({ col }) => col === bestCol);
            const amount = preferred?.val ?? numericCols[numericCols.length - 1]?.val ?? 0;
            if (amount > 0) stratBResults.push({ lineItemId, amount, usedSheet: sheetName });
          }

          // Return whichever strategy found more matches
          return stratAResults.length >= stratBResults.length ? stratAResults : stratBResults;
        };

        // Try every sheet; keep the best result
        let best: { lineItemId: string; amount: number; usedSheet: string }[] = [];
        for (const name of wb.SheetNames) {
          const result = parseSheet(name);
          if (result.length > best.length) best = result;
        }

        if (best.length > 0) {
          setItems((prev) => {
            const updated = [...prev];
            for (const { lineItemId, amount } of best) {
              const idx = updated.findIndex((it) => it.lineItemId === lineItemId);
              if (idx >= 0) updated[idx] = { ...updated[idx], currentAmount: amount };
            }
            return updated;
          });
          const sheetNote = wb.SheetNames.length > 1 ? ` from sheet "${best[0].usedSheet}"` : "";
          toast({
            title: "Excel imported",
            description: `Matched ${best.length} line item${best.length !== 1 ? "s" : ""}${sheetNote}`,
          });
        } else {
          // Show diagnostics: sheet names and first row of each sheet
          const sheetInfo = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const first = (XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][])[0] ?? [];
            return `"${name}": [${first.slice(0, 5).map((c) => `"${String(c ?? "")}"`).join(", ")}]`;
          }).join(" | ");
          const budgetSample = items.slice(0, 3).map((i) => `"${i.description}"`).join(", ");
          toast({
            title: "No line items matched",
            description: `Sheets — ${sheetInfo}. Budget items: ${budgetSample}.`,
            variant: "destructive",
          });
        }
      } catch {
        toast({ title: "Import failed", description: "Could not read Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Import from PDF — upload to Vercel Blob, then parse via Claude API
  const handlePdfImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (Vercel Blob supports up to 500MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF must be smaller than 50MB.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // 3 MB raw → ~4 MB base64, just under Vercel's 4.5 MB body limit
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "PDF too large",
        description: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please use a PDF under 3 MB (text-based AIA PDFs are typically well under this). Try printing to PDF rather than scanning.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setPdfParsing(true);
    (async () => {
      try {
        // Read as base64 and send as JSON
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/payapp/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf: base64 }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          let msg = `HTTP ${res.status}`;
          try { const j = JSON.parse(body) as { error?: string }; if (j.error) msg = j.error; } catch { if (body) msg = body.slice(0, 200); }
          throw new Error(msg);
        }

        const data = await res.json() as { items: Array<{ description: string; amount: number; grossAmount?: number }> };
        const extractedItems = data.items ?? [];

        // Match each extracted item against budget line items
        let autoMatched = 0;
        const matched: PdfExtractedItem[] = extractedItems.map((extracted) => {
          const descNorm = normalize(extracted.description);

          // 1. Exact normalized match
          let found = items.find((item) => normalize(item.description) === descNorm);

          // 2. Fallback: substring match
          if (!found) {
            found = items.find(
              (item) =>
                normalize(item.description).includes(descNorm) ||
                descNorm.includes(normalize(item.description))
            );
          }

          if (found) autoMatched++;

          return {
            description: extracted.description,
            grossAmount: extracted.grossAmount ?? extracted.amount,  // store raw amount
            matchedLineItemId: found ? found.lineItemId : null,
            manualLineItemId: "",
          };
        });

        setPdfItems(matched);
        toast({
          title: "PDF parsed",
          description: `Extracted ${matched.length} item${matched.length !== 1 ? "s" : ""}, ${autoMatched} matched automatically`,
        });
      } catch (err) {
        toast({
          title: "PDF import failed",
          description: err instanceof Error ? err.message : "Could not parse PDF",
          variant: "destructive",
        });
      } finally {
        setPdfParsing(false);
      }
    })();
    // Reset the input so the same file can be re-imported
    e.target.value = "";
  };

  // Apply PDF extracted items to the grid as gross amounts; retainage is applied globally at save time
  const applyPdfItems = () => {
    let applied = 0;
    setItems((prev) => {
      const updated = [...prev];
      for (const pdfItem of pdfItems) {
        const targetId = pdfItem.matchedLineItemId ?? pdfItem.manualLineItemId;
        if (!targetId) continue;
        const idx = updated.findIndex((item) => item.lineItemId === targetId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], currentAmount: pdfItem.grossAmount };
          applied++;
        }
      }
      return updated;
    });
    setPdfItems([]);
    toast({
      title: "Applied to grid",
      description: `Updated ${applied} line item${applied !== 1 ? "s" : ""} from PDF`,
    });
  };

  // Upload the required pay app document to Vercel Blob immediately on selection
  const handleRequiredPdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "File must be under 50 MB", variant: "destructive" });
      return;
    }

    setRequiredPdfFile(file);
    setRequiredPdfUrl("");
    setRequiredPdfUploading(true);

    try {
      const { upload } = await import("@vercel/blob/client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `invoices/${Date.now()}-${safeName}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/invoices/upload",
      });
      setRequiredPdfUrl(blob.url);
      toast({ title: "Pay app PDF attached", description: file.name });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload PDF",
        variant: "destructive",
      });
      setRequiredPdfFile(null);
      setRequiredPdfUrl("");
    } finally {
      setRequiredPdfUploading(false);
    }
  };

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setStep("form");
        setGcCompany("");
        setAppNumber("");
        setPeriodTo(new Date().toISOString().split("T")[0]);
        setApproverId("");
        setItems([]);
        setPdfItems([]);
        setChangeOrderAmount(0);
        setCoLineItemId(null);
        setHardCostCategoryId(null);
        setRequiredPdfFile(null);
        setRequiredPdfUrl("");
        setRequiredPdfUploading(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  // Fetch hard cost line items from the project budget
  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch("/api/auth/users").then((r) => r.json()),
    ])
      .then(([project, usersData]) => {
        setUsers(usersData);
        if (!approverId) {
          const defaultApprover = usersData.find((u: { id: string; name: string }) => u.name.toLowerCase().includes("porter anderson"));
          if (defaultApprover) setApproverId(defaultApprover.id);
        }

        const categories: BudgetCategory[] = project.budgetCategories || [];
        // Filter to Hard Costs group only
        const hardCostCategories = categories.filter(
          (c) => c.categoryGroup === "Hard Costs" || c.categoryGroup === "Hard Cost"
        );

        // Store first Hard Costs category ID for creating new CO line items
        if (hardCostCategories.length > 0) {
          setHardCostCategoryId(hardCostCategories[0].id);
        }

        const formItems: PayAppFormItem[] = [];
        for (const cat of hardCostCategories) {
          for (const li of cat.lineItems) {
            formItems.push({
              lineItemId: li.id,
              description: li.description,
              categoryName: cat.name,
              budget: li.revisedBudget,
              previouslyBilled: li.actualCost,
              currentAmount: 0,
            });
          }
        }
        setItems(formItems);

        // Find existing change order line item to link pay app CO amounts to
        const coItem = formItems.find((item) =>
          item.description.toLowerCase().includes("change order")
        );
        setCoLineItemId(coItem?.lineItemId ?? null);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load budget data", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [open, projectId, toast]);

  const updateAmount = (index: number, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, currentAmount: value } : item))
    );
  };

  const retainageRate = Math.min(Math.max(retainagePct, 0), 100) / 100;
  const netAmount = (gross: number) => Math.round(gross * (1 - retainageRate) * 100) / 100;
  const itemsWithAmounts = items.filter((li) => li.currentAmount > 0);
  const totalCurrentBilled = itemsWithAmounts.reduce((sum, li) => sum + netAmount(li.currentAmount), 0);
  const grandTotal = totalCurrentBilled + netAmount(changeOrderAmount);

  const handleSave = async (submitForApproval = false) => {
    if (!requiredPdfUrl) {
      toast({ title: "Pay app document required", description: "Upload the pay application document before saving", variant: "destructive" });
      return;
    }

    if (itemsWithAmounts.length === 0 && changeOrderAmount === 0) {
      toast({ title: "No amounts entered", description: "Enter at least one line item amount or a change order amount", variant: "destructive" });
      return;
    }

    if (!gcCompany.trim()) {
      toast({ title: "GC company required", description: "Enter the GC company name", variant: "destructive" });
      return;
    }

    if (submitForApproval && !approverId) {
      toast({ title: "Approver required", description: "Select an approver to submit for approval", variant: "destructive" });
      return;
    }

    setStep("saving");

    try {
      const approverUser = users.find((u) => u.id === approverId);

      // Resolve or create the change order budget line item
      let resolvedCoLineItemId: string | null = coLineItemId;
      if (changeOrderAmount > 0 && !resolvedCoLineItemId) {
        if (!hardCostCategoryId) {
          toast({
            title: "No Hard Costs category found",
            description: "Add at least one Hard Costs category to the project budget before entering a change order.",
            variant: "destructive",
          });
          setStep("form");
          return;
        }
        const coRes = await fetch("/api/budget-line-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: hardCostCategoryId,
            description: "Change Orders",
            originalBudget: changeOrderAmount,
            revisedBudget: changeOrderAmount,
          }),
        });
        if (!coRes.ok) {
          const err = await coRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Failed to create Change Orders budget line item");
        }
        const coLineItem = await coRes.json() as { id: string };
        resolvedCoLineItemId = coLineItem.id;
        setCoLineItemId(coLineItem.id);
      }

      // Build line item breakdown for the description
      const coNet = netAmount(changeOrderAmount);
      const lineBreakdown = [
        ...itemsWithAmounts.map((li) => `${li.description}: ${formatCurrency(netAmount(li.currentAmount))}`),
        ...(changeOrderAmount > 0 ? [`Change Orders: ${formatCurrency(coNet)}`] : []),
      ].join("\n");

      // Store line item IDs and net amounts as JSON for budget distribution on approval
      const payAppLineItems = [
        ...itemsWithAmounts.map((li) => ({
          lineItemId: li.lineItemId,
          description: li.description,
          amount: netAmount(li.currentAmount),
        })),
        ...(changeOrderAmount > 0
          ? [{ lineItemId: resolvedCoLineItemId, description: "Change Orders", amount: coNet }]
          : []),
      ];

      const itemCount = itemsWithAmounts.length + (changeOrderAmount > 0 ? 1 : 0);

      const body: Record<string, unknown> = {
        vendorName: gcCompany.trim(),
        invoiceNumber: appNumber ? `PA-${appNumber}` : null,
        amount: grandTotal,
        date: periodTo,
        description: `Pay Application${appNumber ? ` #${appNumber}` : ""} - ${itemCount} line items`,
        projectId: projectId || null,
        budgetLineItemId: null,
        filePath: requiredPdfUrl || null,
        aiNotes: `Pay App Line Items:\n${lineBreakdown}\n\n__payAppLineItems__${JSON.stringify(payAppLineItems)}`,
      };

      if (submitForApproval) {
        body.status = "Submitted";
        body.approver = approverUser?.name ?? "";
        body.approverId = approverId;
        body.submittedBy = user?.name ?? "";
        body.submittedById = user?.id ?? null;
        body.submittedDate = new Date().toISOString();
      }

      let res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const dupeData = await res.json();
        toast({
          title: "⚠️ Possible duplicate detected",
          description: dupeData.message,
          variant: "destructive",
        });
        res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, skipDuplicateCheck: true }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to create pay app");
      }

      toast({
        title: submitForApproval ? "Pay app submitted for approval" : "Pay app created",
        description: `${formatCurrency(grandTotal)} across ${itemCount} line items`,
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save pay app",
        variant: "destructive",
      });
      setStep("form");
    }
  };

  const approverOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({ value: u.id, label: u.name }));

  // Group items by subcategory for display
  const grouped = new Map<string, PayAppFormItem[]>();
  for (const item of items) {
    if (!grouped.has(item.categoryName)) grouped.set(item.categoryName, []);
    grouped.get(item.categoryName)!.push(item);
  }

  // All budget line items as flat options for the unmatched dropdown
  const allLineItemOptions = items.map((item) => ({
    value: item.lineItemId,
    label: `${item.categoryName} › ${item.description}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent fullScreen className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Pay Application Entry" : "Creating Invoices"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Enter the current billing amounts for each hard cost line item."
              : "Creating invoices from entered amounts..."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>GC Company *</Label>
                <Input
                  value={gcCompany}
                  onChange={(e) => setGcCompany(e.target.value)}
                  placeholder="General contractor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Application #</Label>
                <Input
                  value={appNumber}
                  onChange={(e) => setAppNumber(e.target.value)}
                  placeholder="Pay app number"
                />
              </div>
              <div className="space-y-2">
                <Label>Period To</Label>
                <Input
                  type="date"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Retainage %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={retainagePct}
                  onChange={(e) => setRetainagePct(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Required pay app attachment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm font-medium">
                Pay Application Document <span className="text-destructive">*</span>
              </Label>
              {requiredPdfUrl ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate text-foreground">{requiredPdfFile?.name}</span>
                  <button
                    type="button"
                    className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => {
                      setRequiredPdfFile(null);
                      setRequiredPdfUrl("");
                      if (requiredPdfRef.current) requiredPdfRef.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/5"
                  onClick={() => requiredPdfRef.current?.click()}
                  disabled={requiredPdfUploading}
                >
                  {requiredPdfUploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload Pay App (PDF or Excel)</>
                  )}
                </Button>
              )}
              <input
                ref={requiredPdfRef}
                type="file"
                accept=".pdf,.xlsx,.xls"
                className="hidden"
                onChange={handleRequiredPdfSelect}
              />
            </div>

            {/* Import/Export buttons */}
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => excelInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Import from Excel
                </Button>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelImport}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={pdfParsing}
                >
                  {pdfParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Parsing PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-1" />
                      Upload Pay App PDF
                    </>
                  )}
                </Button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfImport}
                />
              </div>
            )}

            {/* Line items table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading budget line items...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hard cost line items found in this project&apos;s budget. Add line items to the budget first.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="py-2 px-3">Line Item</th>
                      <th className="py-2 px-3 text-right w-32">Budget</th>
                      <th className="py-2 px-3 text-right w-32">Previously Billed</th>
                      <th className="py-2 px-3 text-right w-36">{retainageRate > 0 ? "This Period (Gross)" : "This Period"}</th>
                      {retainageRate > 0 && <th className="py-2 px-3 text-right w-28">Net (−ret.)</th>}
                      <th className="py-2 px-3 text-right w-28">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(grouped.entries()).map(([catName, catItems]) => (
                      <tbody key={catName}>
                        {/* Subcategory header */}
                        <tr className="bg-primary/10 border-t-2 border-primary/20">
                          <td colSpan={retainageRate > 0 ? 6 : 5} className="py-2 px-3 font-semibold text-foreground">
                            {catName}
                          </td>
                        </tr>
                        {catItems.map((item) => {
                          const idx = items.indexOf(item);
                          const net = netAmount(item.currentAmount);
                          const remaining = item.budget - item.previouslyBilled - net;
                          return (
                            <tr key={item.lineItemId} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-1.5 px-3">{item.description}</td>
                              <td className="py-1.5 px-3 text-right text-muted-foreground">
                                {formatCurrency(item.budget)}
                              </td>
                              <td className="py-1.5 px-3 text-right text-muted-foreground">
                                {formatCurrency(item.previouslyBilled)}
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-32 text-right h-7 text-sm"
                                  value={item.currentAmount || ""}
                                  onChange={(e) => updateAmount(idx, parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                />
                              </td>
                              {retainageRate > 0 && (
                                <td className="py-1.5 px-3 text-right text-muted-foreground">
                                  {item.currentAmount > 0 ? formatCurrency(net) : ""}
                                </td>
                              )}
                              <td className={`py-1.5 px-3 text-right ${remaining < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                                {formatCurrency(remaining)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    ))}
                  </tbody>
                  {/* Change Orders section */}
                  <tbody>
                    <tr className="bg-primary/10 border-t-2 border-primary/20">
                      <td colSpan={retainageRate > 0 ? 6 : 5} className="py-2 px-3 font-semibold text-foreground">
                        Change Orders
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 px-3 text-sm text-muted-foreground">Change Order Amount</td>
                      <td className="py-1.5 px-3 text-right text-muted-foreground">—</td>
                      <td className="py-1.5 px-3 text-right text-muted-foreground">—</td>
                      <td className="py-1.5 px-3 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-32 text-right h-7 text-sm"
                          value={changeOrderAmount || ""}
                          onChange={(e) => setChangeOrderAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </td>
                      {retainageRate > 0 && (
                        <td className="py-1.5 px-3 text-right text-muted-foreground">
                          {changeOrderAmount > 0 ? formatCurrency(netAmount(changeOrderAmount)) : ""}
                        </td>
                      )}
                      <td className="py-1.5 px-3 text-right text-muted-foreground">—</td>
                    </tr>
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-primary/20 font-semibold">
                      <td className="py-2 px-3">
                        Total ({itemsWithAmounts.length} items{changeOrderAmount > 0 ? " + CO" : ""})
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(items.reduce((s, li) => s + li.budget, 0))}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(items.reduce((s, li) => s + li.previouslyBilled, 0))}
                      </td>
                      <td className="py-2 px-3 text-right text-primary">
                        {formatCurrency(items.reduce((s, li) => s + li.currentAmount, 0) + changeOrderAmount)}
                      </td>
                      {retainageRate > 0 && (
                        <td className="py-2 px-3 text-right text-primary">
                          {formatCurrency(grandTotal)}
                        </td>
                      )}
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(
                          items.reduce((s, li) => s + li.budget - li.previouslyBilled - netAmount(li.currentAmount), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* PDF Extracted Items section */}
            {pdfItems.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">PDF Extracted Items</span>
                    {retainageRate > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({retainagePct}% retainage applied on save)
                      </span>
                    )}
                  </div>
                  <Button type="button" size="sm" onClick={applyPdfItems}>
                    Apply to Grid
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-left text-muted-foreground">
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right w-28">Gross</th>
                        <th className="py-2 px-3 text-right w-28">Net (after ret.)</th>
                        <th className="py-2 px-3 w-24">Status</th>
                        <th className="py-2 px-3">Budget Line Item</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdfItems.map((pdfItem, idx) => {
                        const matchedItem = pdfItem.matchedLineItemId
                          ? items.find((i) => i.lineItemId === pdfItem.matchedLineItemId)
                          : null;
                        const net = Math.round(pdfItem.grossAmount * (1 - retainageRate) * 100) / 100;
                        return (
                          <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-1.5 px-3 text-foreground">{pdfItem.description}</td>
                            <td className="py-1.5 px-3 text-right text-muted-foreground">{formatCurrency(pdfItem.grossAmount)}</td>
                            <td className="py-1.5 px-3 text-right font-medium">{formatCurrency(net)}</td>
                            <td className="py-1.5 px-3">
                              {matchedItem ? (
                                <span className="flex items-center gap-1 text-green-500">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-xs">Matched</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-yellow-500">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-xs">Unmatched</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              {matchedItem ? (
                                <span className="text-muted-foreground text-xs">
                                  {matchedItem.categoryName} › {matchedItem.description}
                                </span>
                              ) : (
                                <SelectNative
                                  value={pdfItem.manualLineItemId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPdfItems((prev) =>
                                      prev.map((p, i) =>
                                        i === idx ? { ...p, manualLineItemId: val } : p
                                      )
                                    );
                                  }}
                                  placeholder="Select a line item..."
                                  options={allLineItemOptions}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                  Unmatched items without a selection will be skipped
                </p>
              </div>
            )}

            {/* Approver */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign Approver</Label>
                <SelectNative
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder="Select an approver"
                  options={approverOptions}
                />
              </div>
              <div className="space-y-2">
                <Label>Submitted By</Label>
                <Input value={user?.name ?? ""} disabled className="bg-muted" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button variant="outline" onClick={() => handleSave(false)} disabled={!requiredPdfUrl || requiredPdfUploading}>Save as Drafts</Button>
              <Button onClick={() => handleSave(true)} disabled={!requiredPdfUrl || requiredPdfUploading}>Submit for Approval</Button>
            </DialogFooter>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Creating invoices from pay application...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
