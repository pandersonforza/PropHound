"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import type { BudgetLineItem } from "@/types";

interface DrawLineItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawId: string;
  projectId: string;
  onSuccess: () => void;
}

export function DrawLineItemForm({
  open,
  onOpenChange,
  drawId,
  projectId,
  onSuccess,
}: DrawLineItemFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [selectedLineItemId, setSelectedLineItemId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      fetch(`/api/projects/${projectId}`)
        .then((r) => r.json())
        .then((project) => {
          const items: BudgetLineItem[] = [];
          for (const cat of project.budgetCategories || []) {
            for (const li of cat.lineItems || []) {
              items.push(li);
            }
          }
          setLineItems(items);
        })
        .catch(() => {});
      setSelectedLineItemId("");
      setAmount("");
    }
  }, [open, projectId]);

  const selectedItem = lineItems.find((li) => li.id === selectedLineItemId);
  const remaining = selectedItem
    ? selectedItem.revisedBudget - selectedItem.actualCost
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/draws/${drawId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetLineItemId: selectedLineItemId,
          thisDrawAmount: parseFloat(amount),
        }),
      });
      if (!res.ok) throw new Error("Failed to add line item");
      toast({ title: "Draw line item added" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to add line item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Draw Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drawLineItem">Budget Line Item</Label>
            <select
              id="drawLineItem"
              value={selectedLineItemId}
              onChange={(e) => setSelectedLineItemId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select line item...</option>
              {lineItems.map((li) => (
                <option key={li.id} value={li.id}>
                  {li.description} (Budget: {formatCurrency(li.revisedBudget)})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revised Budget:</span>
                <CurrencyDisplay amount={selectedItem.revisedBudget} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual to Date:</span>
                <CurrencyDisplay amount={selectedItem.actualCost} />
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining:</span>
                <CurrencyDisplay amount={remaining} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="drawAmount">Draw Amount</Label>
            <Input
              id="drawAmount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
