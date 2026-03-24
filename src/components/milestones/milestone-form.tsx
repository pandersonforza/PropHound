"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  devFee: number;
  paidAmount: number;
  expectedDate: string | null;
  completedDate: string | null;
  status: string;
  sortOrder: number;
}

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: Milestone;
  onSuccess: () => void;
}

const STATUSES = ["Pending", "Completed"];

export function MilestoneForm({
  open,
  onOpenChange,
  projectId,
  milestone,
  onSuccess,
}: MilestoneFormProps) {
  const isEdit = !!milestone;
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
    devFee: "",
    paidAmount: "",
    expectedDate: "",
    completedDate: "",
    status: "Pending",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (milestone) {
      setForm({
        name: milestone.name,
        description: milestone.description || "",
        devFee: milestone.devFee.toString(),
        paidAmount: milestone.paidAmount.toString(),
        expectedDate: milestone.expectedDate
          ? new Date(milestone.expectedDate).toISOString().split("T")[0]
          : "",
        completedDate: milestone.completedDate
          ? new Date(milestone.completedDate).toISOString().split("T")[0]
          : "",
        status: milestone.status,
      });
    } else {
      setForm({
        name: "",
        description: "",
        devFee: "",
        paidAmount: "",
        expectedDate: "",
        completedDate: "",
        status: "Pending",
      });
    }
  }, [milestone, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const body = {
        projectId,
        name: form.name,
        description: form.description || null,
        devFee: parseFloat(form.devFee) || 0,
        paidAmount: parseFloat(form.paidAmount) || 0,
        expectedDate: form.expectedDate || null,
        completedDate: form.completedDate || null,
        status: form.status,
      };

      const url = isEdit ? `/api/milestones/${milestone.id}` : "/api/milestones";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save milestone");

      toast({ title: isEdit ? "Milestone updated" : "Milestone created" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save milestone",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Milestone Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dev Fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.devFee}
                onChange={(e) => setForm({ ...form, devFee: e.target.value })}
              />
            </div>
            <div>
              <Label>Paid Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.paidAmount}
                onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Completed Date</Label>
              <Input
                type="date"
                value={form.completedDate}
                onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
