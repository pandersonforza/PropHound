"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect, SelectNative } from "@/components/ui/select";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { InvoiceWithRelations } from "@/types";

export interface InvoiceForApproval {
  id: string;
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  description: string | null;
  filePath: string | null;
  aiNotes: string | null;
  project: { id: string; name: string; address: string } | null;
  lineItem: {
    id: string;
    description: string;
    category: { id?: string; name: string } | null;
  } | null;
}

interface InvoiceApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceForApproval | null;
  onSuccess: (updated?: InvoiceWithRelations) => void;
}

export function InvoiceApprovalDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: InvoiceApprovalDialogProps) {
  const [form, setForm] = useState({ vendorName: "", invoiceNumber: "", amount: "", description: "" });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedLineItemId, setSelectedLineItemId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; address: string }[]>([]);
  const [lineItems, setLineItems] = useState<{ id: string; description: string; category: { name: string } }[]>([]);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<{ id: string; invoiceNumber: string | null; amount: number; status: string; project: { name: string } | null }[]>([]);
  const [showStatusOverride, setShowStatusOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Populate form when invoice changes
  useEffect(() => {
    if (!invoice || !open) return;
    setForm({
      vendorName: invoice.vendorName,
      invoiceNumber: invoice.invoiceNumber || "",
      amount: String(invoice.amount),
      description: invoice.description || "",
    });
    setSelectedProjectId(invoice.project?.id || "");
    setSelectedLineItemId(invoice.lineItem?.id || "");
    setShowRejectInput(false);
    setRejectReason("");
    setDuplicates([]);
    // Fetch projects and check for duplicates in parallel
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : [])
      .then(setProjects)
      .catch(() => setProjects([]));
    fetch(`/api/invoices?vendorName=${encodeURIComponent(invoice.vendorName)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((all: { id: string; invoiceNumber: string | null; amount: number; status: string; project: { name: string } | null }[]) => {
        const dupes = all.filter((inv) => {
          if (inv.id === invoice.id) return false;
          if (inv.status === "Rejected") return false;
          if (!invoice.invoiceNumber || !inv.invoiceNumber) return false;
          const sameInvoiceNumber = inv.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase();
          const sameProject = inv.project?.name === invoice.project?.name;
          return sameInvoiceNumber && sameProject;
        });
        setDuplicates(dupes);
      })
      .catch(() => setDuplicates([]));
  }, [invoice, open]);

  // Fetch line items when project changes
  useEffect(() => {
    if (!selectedProjectId || !open) { setLineItems([]); return; }
    setLoadingLineItems(true);
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((p) => {
        const items: { id: string; description: string; category: { name: string } }[] = [];
        for (const cat of p.budgetCategories || []) {
          for (const li of cat.lineItems || []) {
            items.push({ id: li.id, description: li.description, category: { name: cat.name } });
          }
        }
        setLineItems(items);
      })
      .catch(() => setLineItems([]))
      .finally(() => setLoadingLineItems(false));
  }, [selectedProjectId, open]);

  const handleClose = () => {
    onOpenChange(false);
    setShowRejectInput(false);
    setRejectReason("");
    setShowStatusOverride(false);
    setOverrideStatus("");
    setLineItems([]);
    setDuplicates([]);
  };

  const handleApprove = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Approved",
          vendorName: form.vendorName,
          invoiceNumber: form.invoiceNumber || null,
          amount: parseFloat(form.amount),
          description: form.description || null,
          projectId: selectedProjectId || null,
          budgetLineItemId: selectedLineItemId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Invoice Approved", description: `Invoice from ${form.vendorName} has been approved.` });
      handleClose();
      onSuccess(updated);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to approve invoice", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          rejectionReason: rejectReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Invoice Rejected", description: `Invoice has been rejected.` });
      handleClose();
      onSuccess(updated);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to reject invoice", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusOverride = async () => {
    if (!invoice || !overrideStatus) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminOverride: true, status: overrideStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Status updated", description: `Invoice moved to "${overrideStatus}".` });
      handleClose();
      onSuccess(updated);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update status", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (!invoice) return null;

  const payItems = (() => {
    const match = invoice.aiNotes?.match(/__payAppLineItems__([\s\S]+)$/);
    if (!match) return [];
    try { return JSON.parse(match[1]) as { lineItemId: string; description: string; amount: number }[]; }
    catch { return []; }
  })();
  const isPayApp = payItems.length > 0;

  const isDevFee = !!invoice.aiNotes?.includes("__devFeePdfMeta__");

  const pdfUrl = isDevFee
    ? `/api/invoices/dev-fee/${invoice.id}/pdf`
    : invoice.filePath
      ? invoice.filePath.startsWith("http")
        ? `/api/invoices/file?url=${encodeURIComponent(invoice.filePath)}`
        : invoice.filePath
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent fullScreen className="flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-border">
          <DialogTitle>Review {isPayApp ? "Pay Application" : "Invoice"}</DialogTitle>
          <DialogDescription>
            Review the details below and approve or reject.
          </DialogDescription>
        </DialogHeader>

        <div className={`flex-1 overflow-hidden ${pdfUrl ? "grid grid-cols-[3fr_2fr]" : "flex flex-col"}`}>
          {/* PDF preview — left */}
          {pdfUrl && (
            <div className="border-r border-border overflow-hidden">
              <iframe src={pdfUrl} className="w-full h-full" title="Invoice PDF Preview" />
            </div>
          )}

          {/* Details — right */}
          <div className="overflow-y-auto p-6 space-y-4">
            {/* Duplicate warning */}
            {duplicates.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">Possible duplicate invoice</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {duplicates.map((d) => (
                      <li key={d.id}>
                        {d.invoiceNumber ? `#${d.invoiceNumber} · ` : ""}
                        ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {d.project ? ` · ${d.project.name}` : ""} —{" "}
                        <span className="capitalize">{d.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {/* Pay app items */}
            {isPayApp && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-sm font-medium bg-muted/30 border-b border-border">
                  Line Items ({payItems.length})
                </div>
                <div className="max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-1.5 px-3">Description</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-1.5 px-3">{item.description}</td>
                          <td className="py-1.5 px-3 text-right">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-background">
                      <tr className="border-t-2 border-primary/20 font-semibold">
                        <td className="py-1.5 px-3">Total</td>
                        <td className="py-1.5 px-3 text-right text-primary">
                          ${payItems.reduce((s, i) => s + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="iad-vendor">Vendor Name</Label>
                <Input id="iad-vendor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iad-number">Invoice #</Label>
                <Input id="iad-number" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iad-amount">Amount</Label>
                <Input id="iad-amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iad-desc">Description</Label>
                <Textarea id="iad-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Project</Label>
                <SearchableSelect
                  value={selectedProjectId}
                  onChange={(val) => { setSelectedProjectId(val); setSelectedLineItemId(""); }}
                  placeholder="Select a project"
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.address ? `${p.name} — ${p.address}` : p.name,
                  }))}
                />
              </div>
              {!isPayApp && (
                <div className="space-y-1.5">
                  <Label>Budget Line Item</Label>
                  {!selectedProjectId ? (
                    <p className="text-sm text-muted-foreground">Select a project first</p>
                  ) : loadingLineItems ? (
                    <p className="text-sm text-muted-foreground">Loading line items...</p>
                  ) : lineItems.length === 0 ? (
                    <p className="text-sm text-amber-600">No line items found for this project</p>
                  ) : (
                    <SelectNative
                      value={selectedLineItemId}
                      onChange={(e) => setSelectedLineItemId(e.target.value)}
                      placeholder="Select a line item"
                      options={lineItems.map((li) => ({
                        value: li.id,
                        label: `${li.category.name} — ${li.description}`,
                      }))}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Rejection reason — shown only when rejecting */}
            {showRejectInput && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <Label htmlFor="iad-reject-reason">Reason for rejection (optional)</Label>
                <Textarea
                  id="iad-reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this invoice is being rejected..."
                  rows={2}
                />
              </div>
            )}

          </div>
        </div>

        <DialogFooter className="flex items-center gap-2 px-6 py-4 shrink-0 border-t border-border">
          <div className="flex items-center gap-2 mr-auto">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                Open PDF
              </a>
            )}
            {isAdmin && !showStatusOverride && (
              <button
                onClick={() => setShowStatusOverride(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Override status
              </button>
            )}
            {isAdmin && showStatusOverride && (
              <div className="flex items-center gap-2">
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Set status…</option>
                  {["Submitted", "Approved", "Paid", "Rejected"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={handleStatusOverride} disabled={!overrideStatus || actionLoading}>
                  Apply
                </Button>
                <button
                  onClick={() => { setShowStatusOverride(false); setOverrideStatus(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleClose} disabled={actionLoading}>Cancel</Button>
          {!showRejectInput ? (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowRejectInput(true)}
              disabled={actionLoading}
            >
              Reject
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? "Rejecting..." : "Confirm Reject"}
            </Button>
          )}
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApprove}
            disabled={actionLoading}
          >
            {actionLoading ? "Approving..." : `Approve ${isPayApp ? "Pay App" : "Invoice"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
