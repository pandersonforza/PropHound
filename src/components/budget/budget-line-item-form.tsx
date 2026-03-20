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
import { useToast } from "@/components/ui/toast";
import type { BudgetLineItem } from "@/types";

interface BudgetLineItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  lineItem?: BudgetLineItem;
  onSuccess: () => void;
}

export function BudgetLineItemForm({
  open,
  onOpenChange,
  categoryId,
  lineItem,
  onSuccess,
}: BudgetLineItemFormProps) {
  const isEdit = !!lineItem;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: "",
    originalBudget: "",
    revisedBudget: "",
  });

  useEffect(() => {
    if (lineItem) {
      setForm({
        description: lineItem.description,
        originalBudget: String(lineItem.originalBudget),
        revisedBudget: String(lineItem.revisedBudget),
      });
    } else {
      setForm({ description: "", originalBudget: "", revisedBudget: "" });
    }
  }, [lineItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        categoryId,
        description: form.description,
        originalBudget: parseFloat(form.originalBudget),
        revisedBudget: parseFloat(form.revisedBudget || form.originalBudget),
      };

      const url = isEdit ? `/api/budget-line-items/${lineItem.id}` : "/api/budget-line-items";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save line item");
      toast({ title: isEdit ? "Line item updated" : "Line item created" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to save line item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="liDesc">Description</Label>
            <Input
              id="liDesc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liOriginal">Original Budget</Label>
              <Input
                id="liOriginal"
                type="number"
                step="0.01"
                value={form.originalBudget}
                onChange={(e) => setForm({ ...form, originalBudget: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liRevised">Revised Budget</Label>
              <Input
                id="liRevised"
                type="number"
                step="0.01"
                value={form.revisedBudget}
                onChange={(e) => setForm({ ...form, revisedBudget: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
