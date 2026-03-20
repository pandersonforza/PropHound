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
import { CONTRACT_TYPES, CONTRACT_STATUSES } from "@/lib/constants";
import type { Vendor, BudgetLineItem, Contract } from "@/types";

interface ContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contract?: Contract & { vendor?: Vendor };
  onSuccess: () => void;
}

export function ContractForm({
  open,
  onOpenChange,
  projectId,
  contract,
  onSuccess,
}: ContractFormProps) {
  const isEdit = !!contract;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);

  const [form, setForm] = useState({
    title: "",
    vendorId: "",
    lineItemId: "",
    amount: "",
    type: CONTRACT_TYPES[0] as string,
    status: CONTRACT_STATUSES[0] as string,
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (open) {
      fetch("/api/vendors")
        .then((r) => r.json())
        .then(setVendors)
        .catch(() => {});

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
    }
  }, [open, projectId]);

  useEffect(() => {
    if (contract) {
      setForm({
        title: contract.title,
        vendorId: contract.vendorId,
        lineItemId: contract.lineItemId || "",
        amount: String(contract.amount),
        type: contract.type,
        status: contract.status,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
      });
    } else {
      setForm({
        title: "",
        vendorId: "",
        lineItemId: "",
        amount: "",
        type: CONTRACT_TYPES[0],
        status: CONTRACT_STATUSES[0],
        startDate: "",
        endDate: "",
      });
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        projectId,
        title: form.title,
        vendorId: form.vendorId,
        lineItemId: form.lineItemId || undefined,
        amount: parseFloat(form.amount),
        type: form.type,
        status: form.status,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      };

      const url = isEdit ? `/api/contracts/${contract.id}` : "/api/contracts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save contract");
      toast({ title: isEdit ? "Contract updated" : "Contract created" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to save contract", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contract" : "Add Contract"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractTitle">Title</Label>
            <Input
              id="contractTitle"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractVendor">Vendor</Label>
              <select
                id="contractVendor"
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} - {v.company}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractLineItem">Budget Line Item</Label>
              <select
                id="contractLineItem"
                value={form.lineItemId}
                onChange={(e) => setForm({ ...form, lineItemId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {lineItems.map((li) => (
                  <option key={li.id} value={li.id}>{li.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractAmount">Amount</Label>
              <Input
                id="contractAmount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Type</Label>
              <select
                id="contractType"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractStatus">Status</Label>
              <select
                id="contractStatus"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractStart">Start Date</Label>
              <Input
                id="contractStart"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractEnd">End Date</Label>
              <Input
                id="contractEnd"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
