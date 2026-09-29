"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InvoiceUpload } from "@/components/invoices/invoice-upload";
import { PayAppEntry } from "@/components/invoices/payapp-entry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { Plus, ExternalLink, Trash2, DollarSign, FileText, FileDown, SlidersHorizontal, X, Archive, LoaderCircle, ClipboardList, CheckSquare, Square } from "lucide-react";
import { SelectNative } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { InvoiceApprovalDialog } from "@/components/invoices/invoice-approval-dialog";
import { useGroups } from "@/hooks/use-groups";
import type { InvoiceWithRelations } from "@/types";

function getInvoicePdfUrl(
  filePath: string | null | undefined,
  id?: string,
  invoiceNumber?: string | null
): string | null {
  // Dev fee invoices: generate PDF on demand from our endpoint
  if (invoiceNumber?.startsWith("DF-") && id) {
    return `/api/invoices/dev-fee/${id}/pdf`;
  }
  if (!filePath) return null;
  return filePath.startsWith("http")
    ? `/api/invoices/file?url=${encodeURIComponent(filePath)}`
    : filePath;
}

interface InvoiceListProps {
  invoices: InvoiceWithRelations[];
  onMutate: () => void;
  showProject?: boolean;
  projectId?: string;
  initialLineItemFilter?: string;
}

export function InvoiceList({
  invoices,
  onMutate,
  showProject = true,
  projectId,
  initialLineItemFilter = "",
}: InvoiceListProps) {
  const [localInvoices, setLocalInvoices] = useState<InvoiceWithRelations[]>(invoices);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [payAppOpen, setPayAppOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewingInvoice, setReviewingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [groupFilter, setGroupFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [lineItemFilter, setLineItemFilter] = useState<string>(initialLineItemFilter);
  const [unsentFilter, setUnsentFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(!!initialLineItemFilter);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [viewOverrideStatus, setViewOverrideStatus] = useState("");
  const [viewShowOverride, setViewShowOverride] = useState(false);
  const { toast } = useToast();
  const { user, canEdit, canMarkPaid } = useAuth();
  const isAdmin = user?.role === "admin";
  const groups = useGroups();

  // Sync local copy when parent refetches (e.g. after upload/delete)
  useEffect(() => { setLocalInvoices(invoices); }, [invoices]);

  // Optimistic patch — avoids a full collection refetch for single-invoice mutations
  const patchInvoice = useCallback((updated: InvoiceWithRelations) => {
    setLocalInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv)));
  }, []);

  const handleViewStatusOverride = async () => {
    if (!viewingInvoice || !viewOverrideStatus) return;
    try {
      const res = await fetch(`/api/invoices/${viewingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminOverride: true, status: viewOverrideStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Status updated", description: `Invoice moved to "${viewOverrideStatus}".` });
      setViewingInvoice(null);
      setViewShowOverride(false);
      setViewOverrideStatus("");
      patchInvoice(updated);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/invoices/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete invoice");
      toast({ title: "Invoice deleted" });
      onMutate();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (invoice: InvoiceWithRelations) => {
    if (!invoice.approver) {
      toast({
        title: "Cannot submit",
        description: "An approver must be assigned before submitting",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Submitted" }),
      });
      if (!res.ok) throw new Error("Failed to submit invoice");
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Invoice submitted for approval" });
      patchInvoice(updated);
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit invoice",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to mark as paid");
      }
      const updated = await res.json() as unknown as InvoiceWithRelations;
      toast({ title: "Invoice marked as paid" });
      patchInvoice(updated);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to mark invoice as paid",
        variant: "destructive",
      });
    }
  };

  const handleToggleSentToAccountant = async (invoiceId: string, current: boolean) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentToAccountant: !current }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json() as unknown as InvoiceWithRelations;
      patchInvoice(updated);
    } catch {
      toast({ title: "Error", description: "Failed to update sent-to-accountant status", variant: "destructive" });
    }
  };

  // Derive unique filter options from invoice data
  const uniqueStatuses = ["All", "Submitted", "Approved", "Paid"].filter(
    (s) => s === "All" || localInvoices.some((i) => i.status === s)
  );
  const uniqueVendors = useMemo(
    () => Array.from(new Set(localInvoices.map((i) => i.vendorName).filter(Boolean))).sort(),
    [localInvoices]
  );
  const uniqueLineItems = useMemo(
    () => Array.from(
      new Map(
        localInvoices
          .filter((i) => i.lineItem)
          .map((i) => [`${i.lineItem!.category.name} — ${i.lineItem!.description}`, i.lineItem!.id])
      ).entries()
    ).sort(([a], [b]) => a.localeCompare(b)),
    [localInvoices]
  );

  const activeFilterCount = [
    statusFilter !== "All",
    groupFilter !== "All",
    vendorFilter !== "",
    lineItemFilter !== "",
    unsentFilter,
  ].filter(Boolean).length;

  const filteredInvoices = useMemo(() => localInvoices.filter((inv) => {
    if (statusFilter !== "All" && inv.status !== statusFilter) return false;
    if (groupFilter !== "All" && inv.project?.projectGroup !== groupFilter) return false;
    if (vendorFilter && inv.vendorName !== vendorFilter) return false;
    if (lineItemFilter && inv.lineItem?.id !== lineItemFilter) return false;
    if (unsentFilter && inv.sentToAccountant) return false;
    return true;
  }), [localInvoices, statusFilter, groupFilter, vendorFilter, lineItemFilter, unsentFilter]);

  // Apply the search-bar filter on top of the dropdown filters so exports match what's visible
  const exportInvoices = useMemo(() => {
    if (!invoiceSearch) return filteredInvoices;
    const q = invoiceSearch.toLowerCase();
    return filteredInvoices.filter(
      (inv) =>
        inv.vendorName?.toLowerCase().includes(q) ||
        (inv.invoiceNumber?.toLowerCase().includes(q) ?? false)
    );
  }, [filteredInvoices, invoiceSearch]);

  // Invoices in the current view that have a downloadable PDF
  const invoicesWithPdf = exportInvoices.filter(
    (inv) => (inv.invoiceNumber?.startsWith("DF-") && inv.id) || inv.filePath
  );

  const handleDownloadAll = async () => {
    if (!invoicesWithPdf.length) return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/invoices/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: invoicesWithPdf.map((inv) => inv.id) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to generate ZIP");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Build a meaningful filename from the active filters
      const parts = ["invoices"];
      if (statusFilter !== "All") parts.push(statusFilter.toLowerCase());
      if (groupFilter !== "All") parts.push(groupFilter.toLowerCase().replace(/\s+/g, "-"));
      a.download = `${parts.join("-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Failed to download invoices",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exportInvoices.length) return;
    setIsPdfExporting(true);
    try {
      // Build a human-readable label describing the current filters
      const parts: string[] = [];
      if (statusFilter !== "All") parts.push(`Status: ${statusFilter}`);
      if (groupFilter !== "All") parts.push(`Group: ${groupFilter}`);
      if (vendorFilter) parts.push(`Vendor: ${vendorFilter}`);
      if (invoiceSearch) parts.push(`Search: "${invoiceSearch}"`);

      const res = await fetch("/api/invoices/approved-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: exportInvoices.map((inv) => inv.id),
          label: parts.join("  |  "),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const datePart = new Date().toISOString().slice(0, 10);
      const nameParts = ["Invoices"];
      if (statusFilter !== "All") nameParts.push(statusFilter);
      if (groupFilter !== "All") nameParts.push(groupFilter.replace(/\s+/g, "-"));
      a.download = `${nameParts.join("_")}_${datePart}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const columns: ColumnDef<InvoiceWithRelations, unknown>[] = [
    {
      accessorKey: "vendorName",
      header: "Vendor Name",
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.invoiceNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amt = row.original.amount;
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amt);
        return (
          <span className={`flex items-center gap-1.5 ${amt < 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
            {formatted}
            {amt < 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                Credit
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    ...(showProject
      ? [
          {
            accessorKey: "project.name" as const,
            header: "Project",
            cell: ({ row }: { row: { original: InvoiceWithRelations } }) => {
              const project = row.original.project;
              if (!project) {
                return (
                  <span className="text-sm text-muted-foreground">
                    Unassigned
                  </span>
                );
              }
              return (
                <Link
                  href={`/projects/${project.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {project.name}
                </Link>
              );
            },
          } satisfies ColumnDef<InvoiceWithRelations, unknown>,
        ]
      : []),
    {
      id: "lineItem",
      header: "Line Item",
      cell: ({ row }) => {
        const li = row.original.lineItem;
        if (!li) {
          return (
            <span className="text-sm text-muted-foreground">-</span>
          );
        }
        return (
          <span className="text-sm">
            {li.category.name} - {li.description}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "sentToAccountant",
      header: () => <span className="text-xs whitespace-nowrap">Sent to Acct.</span>,
      cell: ({ row }) => {
        const sent = row.original.sentToAccountant;
        return (
          <button
            title={sent ? "Mark as not sent" : "Mark as sent to accountant"}
            onClick={() => handleToggleSentToAccountant(row.original.id, sent)}
            className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {sent
              ? <CheckSquare className="h-4 w-4 text-teal-500" />
              : <Square className="h-4 w-4" />}
          </button>
        );
      },
    },
    {
      id: "approver",
      header: "Approver",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.approver || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="View invoice"
              onClick={() => setViewingInvoice(row.original)}
            >
              <FileText className="h-4 w-4" />
            </Button>
            {getInvoicePdfUrl(row.original.filePath, row.original.id, row.original.invoiceNumber) && (
              <a
                href={getInvoicePdfUrl(row.original.filePath, row.original.id, row.original.invoiceNumber)!}
                target="_blank"
                rel="noopener noreferrer"
                download={`${row.original.vendorName ?? "Invoice"}${row.original.invoiceNumber ? ` - ${row.original.invoiceNumber}` : ""}.pdf`}
                title="Open / download PDF"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <FileDown className="h-4 w-4" />
              </a>
            )}
            {canEdit && status === "Submitted" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewingInvoice(row.original)}
                >
                  Review
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete invoice"
                  onClick={() => {
                    setDeleteId(row.original.id);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
            {canMarkPaid && status === "Approved" && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => handleMarkPaid(row.original.id)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Mark Paid
              </Button>
            )}
            {user?.role === "admin" && status !== "Submitted" && (
              <Button
                variant="ghost"
                size="icon"
                title="Delete invoice (admin)"
                onClick={() => {
                  setDeleteId(row.original.id);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isPdfExporting || exportInvoices.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Export current view to PDF (${exportInvoices.length} invoice${exportInvoices.length !== 1 ? "s" : ""})`}
          >
            {isPdfExporting
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : <ClipboardList className="h-4 w-4" />}
            Export PDF
          </button>
          {canEdit && (
            <>
              {projectId && (
                <Button variant="outline" onClick={() => setPayAppOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Pay App Entry
                </Button>
              )}
              <Button onClick={() => setUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 space-y-3">
        {/* Status pills + filter toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {uniqueStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUnsentFilter((v) => !v)}
            className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
              unsentFilter
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Not sent to acct.
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`gap-1.5 ${activeFilterCount > 0 ? "border-primary text-primary" : ""}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-primary text-primary-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter("All"); setGroupFilter("All"); setVendorFilter(""); setLineItemFilter(""); setUnsentFilter(false); }}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {invoicesWithPdf.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="gap-1.5 ml-auto"
              title={`Download ${invoicesWithPdf.length} invoice PDF${invoicesWithPdf.length !== 1 ? "s" : ""} as ZIP`}
            >
              {isDownloading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Download {invoicesWithPdf.length} PDF{invoicesWithPdf.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {/* Group pills — only on the global invoices page */}
        {showProject && (
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
            {["All", ...groups].map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  groupFilter === g
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Expanded filter row */}
        {filtersOpen && (
          <div className="flex items-center gap-4 flex-wrap p-3 rounded-lg border border-border bg-muted/20">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Vendor</label>
              <SelectNative
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                options={[
                  { value: "", label: "All vendors" },
                  ...uniqueVendors.map((v) => ({ value: v, label: v })),
                ]}
                className="w-[200px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Line Item</label>
              <SelectNative
                value={lineItemFilter}
                onChange={(e) => setLineItemFilter(e.target.value)}
                options={[
                  { value: "", label: "All line items" },
                  ...uniqueLineItems.map(([label, value]) => ({ value, label })),
                ]}
                className="w-[280px]"
              />
            </div>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        searchKeys={["vendorName", "invoiceNumber"]}
        searchPlaceholder="Search by vendor or invoice #..."
        searchValue={invoiceSearch}
        onSearchChange={setInvoiceSearch}
      />

      <InvoiceUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        onSuccess={onMutate}
      />

      <PayAppEntry
        open={payAppOpen}
        onOpenChange={setPayAppOpen}
        projectId={projectId}
        onSuccess={onMutate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />

      <InvoiceApprovalDialog
        open={!!reviewingInvoice}
        onOpenChange={(o) => { if (!o) setReviewingInvoice(null); }}
        invoice={reviewingInvoice}
        onSuccess={(updated) => {
          setReviewingInvoice(null);
          if (updated) patchInvoice(updated);
          else onMutate();
        }}
      />

      {/* Read-only invoice view dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(o) => { if (!o) { setViewingInvoice(null); setViewShowOverride(false); setViewOverrideStatus(""); } }}>
        {viewingInvoice && (() => {
          const notes = viewingInvoice.aiNotes || "";
          const match = notes.match(/__payAppLineItems__([\s\S]+)$/);
          let payItems: { lineItemId: string; description: string; amount: number }[] = [];
          if (match) { try { payItems = JSON.parse(match[1]); } catch { /* empty */ } }
          const isPayApp = payItems.length > 0;

          const pdfUrl = getInvoicePdfUrl(viewingInvoice.filePath, viewingInvoice.id, viewingInvoice.invoiceNumber);

          return (
            <DialogContent fullScreen>
              <DialogHeader>
                <DialogTitle>{isPayApp ? "Pay Application" : "Invoice"} — {viewingInvoice.vendorName}</DialogTitle>
                <DialogDescription>
                  {viewingInvoice.invoiceNumber ? `#${viewingInvoice.invoiceNumber} · ` : ""}
                  {formatDate(viewingInvoice.date)} · <StatusBadge status={viewingInvoice.status} />
                </DialogDescription>
              </DialogHeader>

              <div className={`grid gap-6 ${pdfUrl ? "grid-cols-2" : ""}`}>
                {pdfUrl && (
                  <div className="border border-border rounded-lg overflow-hidden h-[65vh]">
                    <iframe src={pdfUrl} className="w-full h-full" title="Invoice PDF" />
                  </div>
                )}

                <div className="overflow-y-auto max-h-[65vh] pr-1 space-y-4">
                  {isPayApp && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 text-sm font-medium bg-muted/30 border-b border-border">
                        Line Items ({payItems.length})
                      </div>
                      <table className="w-full text-sm">
                        <thead>
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
                        <tfoot>
                          <tr className="border-t-2 border-primary/20 font-semibold">
                            <td className="py-1.5 px-3">Total</td>
                            <td className="py-1.5 px-3 text-right text-primary">
                              ${payItems.reduce((s, i) => s + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <span className="text-muted-foreground">Vendor</span>
                      <span className="font-medium">{viewingInvoice.vendorName}</span>
                      <span className="text-muted-foreground">Invoice #</span>
                      <span>{viewingInvoice.invoiceNumber || "—"}</span>
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium"><CurrencyDisplay amount={viewingInvoice.amount} /></span>
                      <span className="text-muted-foreground">Date</span>
                      <span>{formatDate(viewingInvoice.date)}</span>
                      <span className="text-muted-foreground">Status</span>
                      <span><StatusBadge status={viewingInvoice.status} /></span>
                      <span className="text-muted-foreground">Approver</span>
                      <span>{viewingInvoice.approver || "—"}</span>
                      {viewingInvoice.lineItem && (
                        <>
                          <span className="text-muted-foreground">Line Item</span>
                          <span>{viewingInvoice.lineItem.category.name} — {viewingInvoice.lineItem.description}</span>
                        </>
                      )}
                    </div>
                    {viewingInvoice.description && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-muted-foreground mb-1">Description</p>
                        <p>{viewingInvoice.description}</p>
                      </div>
                    )}
                    {viewingInvoice.rejectionReason && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-muted-foreground mb-1">Rejection Reason</p>
                        <p className="text-destructive">{viewingInvoice.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="flex items-center gap-2 mr-auto">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open PDF
                    </a>
                  )}
                  {isAdmin && !viewShowOverride && (
                    <button
                      onClick={() => setViewShowOverride(true)}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Override status
                    </button>
                  )}
                  {isAdmin && viewShowOverride && (
                    <div className="flex items-center gap-2">
                      <select
                        value={viewOverrideStatus}
                        onChange={(e) => setViewOverrideStatus(e.target.value)}
                        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="">Set status…</option>
                        {["Submitted", "Approved", "Paid", "Rejected"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" onClick={handleViewStatusOverride} disabled={!viewOverrideStatus}>
                        Apply
                      </Button>
                      <button
                        onClick={() => { setViewShowOverride(false); setViewOverrideStatus(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={() => { setViewingInvoice(null); setViewShowOverride(false); setViewOverrideStatus(""); }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

    </div>
  );
}
