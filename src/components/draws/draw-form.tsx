"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface ApprovedInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  date: string;
  description: string | null;
  lineItem: {
    id: string;
    description: string;
    category: { id: string; name: string };
  } | null;
}

interface DrawFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function DrawForm({ open, onOpenChange, projectId, onSuccess }: DrawFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [invoices, setInvoices] = useState<ApprovedInvoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetchingInvoices, setFetchingInvoices] = useState(false);

  useEffect(() => {
    if (open) {
      setFetchingInvoices(true);
      fetch(`/api/invoices?projectId=${projectId}&status=Approved`)
        .then((r) => r.json())
        .then((data: ApprovedInvoice[]) => {
          // Filter out invoices already linked to a draw
          const available = data.filter(
            (inv: ApprovedInvoice & { drawRequestId?: string | null }) => !inv.drawRequestId
          );
          setInvoices(available);
          // Select all by default
          setSelectedIds(new Set(available.map((inv: ApprovedInvoice) => inv.id)));
        })
        .catch(() => {
          setInvoices([]);
        })
        .finally(() => setFetchingInvoices(false));
    } else {
      setNotes("");
      setInvoices([]);
      setSelectedIds(new Set());
    }
  }, [open, projectId]);

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(invoices.map((inv) => inv.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectedTotal = invoices
    .filter((inv) => selectedIds.has(inv.id))
    .reduce((sum, inv) => sum + inv.amount, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          notes: notes || undefined,
          invoiceIds: Array.from(selectedIds),
        }),
      });
      if (!res.ok) throw new Error("Failed to create draw");
      toast({ title: "Draw created", description: `${selectedIds.size} invoice(s) included` });
      setNotes("");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to create draw", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Draw Request</DialogTitle>
          <DialogDescription>
            Approved invoices are automatically included. You can add or remove invoices before creating the draw.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invoices</Label>
              {invoices.length > 0 && (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              )}
            </div>

            {fetchingInvoices ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">No approved invoices available for this project.</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto rounded-md border border-border">
                {invoices.map((invoice) => {
                  const isSelected = selectedIds.has(invoice.id);
                  return (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => toggleInvoice(invoice.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {invoice.vendorName}
                          </span>
                          <span className="text-sm font-semibold ml-2 shrink-0">
                            {formatCurrency(invoice.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {invoice.invoiceNumber && (
                            <span>#{invoice.invoiceNumber}</span>
                          )}
                          <span>{formatDate(invoice.date)}</span>
                          {invoice.lineItem && (
                            <span className="truncate">
                              {invoice.lineItem.category.name} - {invoice.lineItem.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {invoices.length > 0 && (
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} of {invoices.length} invoice(s) selected
                </span>
                <span className="text-sm font-semibold">
                  Total: {formatCurrency(selectedTotal)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="drawNotes">Notes</Label>
            <Textarea
              id="drawNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this draw request..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Draw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
