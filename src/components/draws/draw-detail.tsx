"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { DrawStatusWorkflow } from "@/components/draws/draw-status-workflow";
import { DrawLineItemForm } from "@/components/draws/draw-line-item-form";
import { useToast } from "@/components/ui/toast";
import { Plus, X, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DrawRequestWithLineItems } from "@/types";

interface DrawInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string | null;
  amount: number;
  date: string;
  lineItem: {
    description: string;
    category: { name: string };
  } | null;
}

interface DrawDetailProps {
  draw: DrawRequestWithLineItems;
  projectId: string;
  onMutate: () => void;
}

export function DrawDetail({ draw, projectId, onMutate }: DrawDetailProps) {
  const [lineItemFormOpen, setLineItemFormOpen] = useState(false);
  const { toast } = useToast();

  const drawInvoices = ((draw as DrawRequestWithLineItems & { invoices?: DrawInvoice[] }).invoices || []) as DrawInvoice[];

  const handleRemoveInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawRequestId: null }),
      });
      if (!res.ok) throw new Error("Failed to remove invoice");
      toast({ title: "Invoice removed from draw" });
      onMutate();
    } catch {
      toast({ title: "Error", description: "Failed to remove invoice", variant: "destructive" });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`/api/draws/${draw.id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Draw_${draw.drawNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    }
  };

  const handleStatusAction = async (action: string) => {
    try {
      const body: Record<string, unknown> = {};
      if (action === "submit") {
        body.status = "Submitted";
        body.submittedDate = new Date().toISOString();
      } else if (action === "approve") {
        body.status = "Approved";
        body.approvedDate = new Date().toISOString();
      } else if (action === "fund") {
        body.status = "Funded";
        body.fundedDate = new Date().toISOString();
      }

      const res = await fetch(`/api/draws/${draw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update draw status");
      toast({ title: `Draw ${body.status}` });
      onMutate();
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Draw #{draw.drawNumber} Details</CardTitle>
          <div className="flex items-center gap-2">
            {drawInvoices.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
            )}
            {draw.status === "Draft" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLineItemFormOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line Item
                </Button>
                <Button size="sm" onClick={() => handleStatusAction("submit")}>
                  Submit
                </Button>
              </>
            )}
            {draw.status === "Submitted" && (
              <Button size="sm" onClick={() => handleStatusAction("approve")}>
                Approve
              </Button>
            )}
            {draw.status === "Approved" && (
              <Button size="sm" onClick={() => handleStatusAction("fund")}>
                Fund
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <DrawStatusWorkflow currentStatus={draw.status} />

        {draw.notes && (
          <p className="text-sm text-muted-foreground">{draw.notes}</p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Budget Line Item</TableHead>
              <TableHead className="text-right">Current Amount</TableHead>
              <TableHead className="text-right">Previous Draws</TableHead>
              <TableHead className="text-right">This Draw</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draw.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell>{li.budgetLineItem?.description || "N/A"}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(li.currentAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(li.previousDraws)}
                </TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay amount={li.thisDrawAmount} />
                </TableCell>
              </TableRow>
            ))}
            {draw.lineItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  No line items. Add one to get started.
                </TableCell>
              </TableRow>
            )}
            <TableRow className="font-medium bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(draw.lineItems.reduce((s, li) => s + li.currentAmount, 0))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(draw.lineItems.reduce((s, li) => s + li.previousDraws, 0))}
              </TableCell>
              <TableCell className="text-right">
                <CurrencyDisplay amount={draw.totalAmount} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/* Invoices Section */}
        {drawInvoices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Invoices ({drawInvoices.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Line Item</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {draw.status === "Draft" && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.vendorName}</TableCell>
                    <TableCell>{inv.invoiceNumber || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.lineItem
                        ? `${inv.lineItem.category.name} - ${inv.lineItem.description}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatDate(inv.date)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.amount)}</TableCell>
                    {draw.status === "Draft" && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveInvoice(inv.id)}
                          title="Remove from draw"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-muted/50">
                  <TableCell colSpan={draw.status === "Draft" ? 4 : 4}>Invoice Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(drawInvoices.reduce((s, inv) => s + inv.amount, 0))}
                  </TableCell>
                  {draw.status === "Draft" && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <DrawLineItemForm
        open={lineItemFormOpen}
        onOpenChange={setLineItemFormOpen}
        drawId={draw.id}
        projectId={projectId}
        onSuccess={onMutate}
      />
    </Card>
  );
}
