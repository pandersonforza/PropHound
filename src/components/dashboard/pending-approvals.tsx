"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Invoice {
  id: string;
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  description: string | null;
  submittedDate: string | null;
  project: { id: string; name: string } | null;
  lineItem: {
    id: string;
    name: string;
    category: { id: string; name: string } | null;
  } | null;
}

export function PendingApprovals() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingInvoice, setRejectingInvoice] = useState<Invoice | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);
  const [approveForm, setApproveForm] = useState({
    vendorName: "",
    invoiceNumber: "",
    amount: "",
    description: "",
  });
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/invoices?status=Submitted&approverId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInvoices(data);
    } catch {
      console.error("Failed to fetch pending invoices");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchInvoices();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, fetchInvoices]);

  const openApproveDialog = (invoice: Invoice) => {
    setApprovingInvoice(invoice);
    setApproveForm({
      vendorName: invoice.vendorName,
      invoiceNumber: invoice.invoiceNumber || "",
      amount: String(invoice.amount),
      description: invoice.description || "",
    });
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!approvingInvoice) return;
    setActionLoading(approvingInvoice.id);
    try {
      const res = await fetch(`/api/invoices/${approvingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Approved",
          vendorName: approveForm.vendorName,
          invoiceNumber: approveForm.invoiceNumber || null,
          amount: parseFloat(approveForm.amount),
          description: approveForm.description || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }

      toast({
        title: "Invoice Approved",
        description: `Invoice from ${approveForm.vendorName} has been approved.`,
      });
      setApproveDialogOpen(false);
      setApprovingInvoice(null);
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve invoice",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (invoice: Invoice) => {
    setRejectingInvoice(invoice);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingInvoice) return;

    setActionLoading(rejectingInvoice.id);
    try {
      const res = await fetch(`/api/invoices/${rejectingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          rejectionReason: rejectionReason || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }

      toast({
        title: "Invoice Rejected",
        description: `Invoice from ${rejectingInvoice.vendorName} has been rejected.`,
      });
      setRejectDialogOpen(false);
      setRejectingInvoice(null);
      setRejectionReason("");
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject invoice",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle>Invoice Approvals</CardTitle>
            {invoices.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {invoices.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices waiting for your approval.</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.vendorName}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>
                    {invoice.project?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {invoice.submittedDate
                      ? formatDate(invoice.submittedDate)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={actionLoading === invoice.id}
                        onClick={() => openApproveDialog(invoice)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={actionLoading === invoice.id}
                        onClick={() => openRejectDialog(invoice)}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Review and edit the details before approving.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="da-vendor">Vendor Name</Label>
              <Input
                id="da-vendor"
                value={approveForm.vendorName}
                onChange={(e) => setApproveForm({ ...approveForm, vendorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="da-invoiceNumber">Invoice #</Label>
              <Input
                id="da-invoiceNumber"
                value={approveForm.invoiceNumber}
                onChange={(e) => setApproveForm({ ...approveForm, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="da-amount">Amount</Label>
              <Input
                id="da-amount"
                type="number"
                step="0.01"
                value={approveForm.amount}
                onChange={(e) => setApproveForm({ ...approveForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="da-description">Description</Label>
              <Textarea
                id="da-description"
                value={approveForm.description}
                onChange={(e) => setApproveForm({ ...approveForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={actionLoading !== null}
              onClick={handleApprove}
            >
              Approve Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting invoice from{" "}
            <span className="font-medium text-foreground">
              {rejectingInvoice?.vendorName}
            </span>{" "}
            for{" "}
            <span className="font-medium text-foreground">
              {rejectingInvoice ? formatCurrency(rejectingInvoice.amount) : ""}
            </span>
            .
          </p>
          <div className="space-y-2">
            <label htmlFor="rejection-reason" className="text-sm font-medium">
              Reason (optional)
            </label>
            <Input
              id="rejection-reason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading !== null}
              onClick={handleReject}
            >
              Reject Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
