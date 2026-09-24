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
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { InvoiceApprovalDialog, type InvoiceForApproval } from "@/components/invoices/invoice-approval-dialog";

interface Invoice {
  id: string;
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  description: string | null;
  status: string;
  submittedDate: string | null;
  rejectedDate: string | null;
  filePath: string | null;
  aiNotes: string | null;
  rejectionReason: string | null;
  project: { id: string; name: string; address: string } | null;
  lineItem: {
    id: string;
    description: string;
    category: { id: string; name: string } | null;
  } | null;
}

export function PendingApprovals() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingInvoice, setReviewingInvoice] = useState<InvoiceForApproval | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/invoices?status=Submitted,Rejected`);
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

  if (loading) return null;

  const pending  = invoices.filter((i) => i.status === "Submitted");
  const rejected = invoices.filter((i) => i.status === "Rejected");

  // Show oldest submitted first, then rejected (newest first so admins see recent rejects)
  const oldest5 = [
    ...pending.sort((a, b) => {
      const aDate = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const bDate = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      return aDate - bDate;
    }),
    ...rejected.sort((a, b) => {
      const aDate = a.rejectedDate ? new Date(a.rejectedDate).getTime() : 0;
      const bDate = b.rejectedDate ? new Date(b.rejectedDate).getTime() : 0;
      return bDate - aDate;
    }),
  ].slice(0, 5);

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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oldest5.map((invoice) => {
                    const isRejected = invoice.status === "Rejected";
                    const dateStr = isRejected
                      ? (invoice.rejectedDate ? formatDate(invoice.rejectedDate) : "—")
                      : (invoice.submittedDate ? formatDate(invoice.submittedDate) : "—");
                    return (
                    <TableRow key={invoice.id} className={isRejected ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isRejected && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          {invoice.vendorName}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{invoice.project?.name ?? "—"}</TableCell>
                      <TableCell>{dateStr}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={isRejected
                            ? "bg-destructive/15 text-destructive border-destructive/20"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/20"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewingInvoice(invoice)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {invoices.length > 5 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Showing 5 of {invoices.length} ({pending.length} pending, {rejected.length} rejected) — go to the Invoices tab to see all.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <InvoiceApprovalDialog
        open={!!reviewingInvoice}
        onOpenChange={(o) => { if (!o) setReviewingInvoice(null); }}
        invoice={reviewingInvoice}
        onSuccess={(updated) => {
          const id = updated?.id ?? reviewingInvoice?.id;
          setReviewingInvoice(null);
          if (id) setInvoices((prev) => prev.filter((inv) => inv.id !== id));
          else fetchInvoices();
        }}
      />
    </>
  );
}
