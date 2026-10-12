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
import { Loader2, Upload, CheckCircle } from "lucide-react";
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

type Step = "form" | "saving";

interface PayAppEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onSuccess: () => void;
}

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
  const [retainagePct, setRetainagePct] = useState(10);
  const [changeOrderAmount, setChangeOrderAmount] = useState(0);
  const [coLineItemId, setCoLineItemId] = useState<string | null>(null);
  const [hardCostCategoryId, setHardCostCategoryId] = useState<string | null>(null);
  // Required pay app PDF attachment
  const [requiredPdfFile, setRequiredPdfFile] = useState<File | null>(null);
  const [requiredPdfUrl, setRequiredPdfUrl] = useState("");
  const [requiredPdfUploading, setRequiredPdfUploading] = useState(false);
  const requiredPdfRef = useRef<HTMLInputElement>(null);

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
