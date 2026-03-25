"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { Loader2, Upload, FileText, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import type { BudgetLineItemWithCategory } from "@/types";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface PayAppLineItem {
  itemNumber: string | null;
  description: string;
  scheduledValue: number;
  previouslyBilled: number;
  currentBilled: number;
  materialsStored: number;
  totalCompleted: number;
  percentComplete: number;
  balanceToFinish: number;
  retainage: number;
  suggestedBudgetLineItemId?: string | null;
  // UI state
  selected: boolean;
  budgetLineItemId: string;
}

interface PayAppResult {
  gcCompany: string;
  applicationNumber: string | null;
  periodTo: string | null;
  lineItems: PayAppLineItem[];
  summary: Record<string, number>;
  notes: string;
}

type Step = "upload" | "processing" | "review" | "saving";

interface PayAppUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onSuccess: () => void;
}

export function PayAppUpload({ open, onOpenChange, projectId, onSuccess }: PayAppUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filePath, setFilePath] = useState("");

  const [result, setResult] = useState<PayAppResult | null>(null);
  const [lineItems, setLineItems] = useState<PayAppLineItem[]>([]);
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItemWithCategory[]>([]);
  const [approverId, setApproverId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setStep("upload");
        setSelectedFile(null);
        setResult(null);
        setLineItems([]);
        setFilePath("");
        setApproverId("");
        setIsDragging(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open || !projectId) return;
    // Fetch budget line items
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((project) => {
        const items: BudgetLineItemWithCategory[] = [];
        for (const cat of project.budgetCategories || []) {
          for (const li of cat.lineItems || []) {
            items.push({ ...li, category: cat });
          }
        }
        setBudgetLineItems(items);
      })
      .catch(() => {});
    // Fetch users for approver
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data: UserOption[]) => setUsers(data))
      .catch(() => {});
  }, [open, projectId]);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;
    setStep("processing");

    try {
      // Upload file directly to Blob (client-side, bypasses 4.5MB limit)
      const { upload } = await import("@vercel/blob/client");
      const originalName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `invoices/${Date.now()}-${originalName}`;

      const blob = await upload(pathname, selectedFile, {
        access: "private",
        handleUploadUrl: "/api/invoices/upload",
      });

      setFilePath(blob.url);

      // Process with AI
      const processRes = await fetch("/api/invoices/process-payapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: blob.url, projectId }),
      });
      if (!processRes.ok) {
        const err = await processRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to process pay application");
      }

      const data = await processRes.json();
      setResult(data);

      // Initialize line items with UI state
      const items: PayAppLineItem[] = (data.lineItems || []).map((li: PayAppLineItem) => ({
        ...li,
        selected: li.currentBilled > 0,
        budgetLineItemId: li.suggestedBudgetLineItemId || "",
      }));
      setLineItems(items);
      setStep("review");
    } catch (err) {
      toast({
        title: "Processing failed",
        description: err instanceof Error ? err.message : "Could not process pay application",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const toggleLineItem = (index: number) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, selected: !li.selected } : li))
    );
  };

  const updateLineItemBudget = (index: number, budgetLineItemId: string) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, budgetLineItemId } : li))
    );
  };

  const updateLineItemAmount = (index: number, currentBilled: number) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, currentBilled } : li))
    );
  };

  const selectedItems = lineItems.filter((li) => li.selected && li.currentBilled > 0);
  const totalCurrentBilled = selectedItems.reduce((sum, li) => sum + li.currentBilled, 0);

  const handleSave = async (submitForApproval = false) => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Select at least one line item", variant: "destructive" });
      return;
    }

    if (submitForApproval && !approverId) {
      toast({ title: "Approver required", description: "Select an approver to submit for approval", variant: "destructive" });
      return;
    }

    setStep("saving");

    try {
      let created = 0;
      const approverUser = users.find((u) => u.id === approverId);

      for (const li of selectedItems) {
        const body: Record<string, unknown> = {
          vendorName: result?.gcCompany || "Unknown GC",
          invoiceNumber: result?.applicationNumber ? `PA-${result.applicationNumber}-${li.itemNumber || created + 1}` : null,
          amount: li.currentBilled,
          date: result?.periodTo || new Date().toISOString().split("T")[0],
          description: li.description,
          projectId: projectId || null,
          budgetLineItemId: li.budgetLineItemId || null,
          filePath,
          aiNotes: `Pay App line item: ${li.description}. Scheduled: ${formatCurrency(li.scheduledValue)}, Previously billed: ${formatCurrency(li.previouslyBilled)}, This period: ${formatCurrency(li.currentBilled)}, ${li.percentComplete}% complete.`,
        };

        if (submitForApproval) {
          body.status = "Submitted";
          body.approver = approverUser?.name ?? "";
          body.approverId = approverId;
          body.submittedBy = user?.name ?? "";
          body.submittedById = user?.id ?? null;
          body.submittedDate = new Date().toISOString();
        }

        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) created++;
      }

      toast({
        title: submitForApproval ? "Pay app submitted for approval" : "Pay app invoices created",
        description: `Created ${created} invoice${created !== 1 ? "s" : ""} totaling ${formatCurrency(totalCurrentBilled)}`,
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save invoices",
        variant: "destructive",
      });
      setStep("review");
    }
  };

  const budgetOptions = budgetLineItems.map((li) => ({
    value: li.id,
    label: `${li.category.name} - ${li.description}`,
  }));

  const approverOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({ value: u.id, label: u.name }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Pay Application"}
            {step === "processing" && "Processing Pay Application"}
            {step === "review" && "Review Pay Application"}
            {step === "saving" && "Creating Invoices"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a GC pay application (AIA G702/G703) to extract line items."}
            {step === "processing" && "Analyzing pay application with AI..."}
            {step === "review" && "Select line items to create as invoices. Uncheck items you don't want to include."}
            {step === "saving" && "Creating invoices from selected line items..."}
          </DialogDescription>
        </DialogHeader>

        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : selectedFile ? "border-emerald-500 bg-emerald-50" : "border-border hover:border-primary/50"
              }`}
            >
              {selectedFile ? (
                <>
                  <FileText className="h-10 w-10 text-emerald-600 mb-2" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drag and drop your pay application PDF here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleUploadAndProcess} disabled={!selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                Upload &amp; Analyze
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Analyzing pay application with AI...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take up to 30 seconds</p>
          </div>
        )}

        {/* Review */}
        {step === "review" && result && (
          <div className="space-y-4">
            {/* Summary header */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Contractor: </span>
                <span className="font-medium">{result.gcCompany}</span>
              </div>
              <div>
                <span className="text-muted-foreground">App #: </span>
                <span className="font-medium">{result.applicationNumber || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Period To: </span>
                <span className="font-medium">{result.periodTo ? new Date(result.periodTo).toLocaleDateString() : "—"}</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="py-2 px-3 w-8"></th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Scheduled</th>
                    <th className="py-2 px-3 text-right">Previously Billed</th>
                    <th className="py-2 px-3 text-right">This Period</th>
                    <th className="py-2 px-3 text-right">% Complete</th>
                    <th className="py-2 px-3">Budget Line Item</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => (
                    <tr key={idx} className={`border-b border-border/50 ${li.selected ? "" : "opacity-40"}`}>
                      <td className="py-2 px-3">
                        <button onClick={() => toggleLineItem(idx)} className="flex items-center justify-center">
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                            li.selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                          }`}>
                            {li.selected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium">{li.description}</span>
                        {li.itemNumber && <span className="text-xs text-muted-foreground ml-1">#{li.itemNumber}</span>}
                      </td>
                      <td className="py-2 px-3 text-right">{formatCurrency(li.scheduledValue)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(li.previouslyBilled)}</td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28 text-right h-7 text-sm"
                          value={li.currentBilled}
                          onChange={(e) => updateLineItemAmount(idx, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">{li.percentComplete}%</td>
                      <td className="py-2 px-3">
                        <SelectNative
                          value={li.budgetLineItemId}
                          onChange={(e) => updateLineItemBudget(idx, e.target.value)}
                          placeholder="Match to budget"
                          options={budgetOptions}
                          className="h-7 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/20 font-semibold">
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3">
                      Total ({selectedItems.length} items selected)
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(lineItems.reduce((s, li) => s + li.scheduledValue, 0))}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(lineItems.reduce((s, li) => s + li.previouslyBilled, 0))}
                    </td>
                    <td className="py-2 px-3 text-right text-primary">
                      {formatCurrency(totalCurrentBilled)}
                    </td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

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
              <Button variant="outline" onClick={() => handleSave(false)}>Save as Drafts</Button>
              <Button onClick={() => handleSave(true)}>Submit for Approval</Button>
            </DialogFooter>
          </div>
        )}

        {/* Saving */}
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
