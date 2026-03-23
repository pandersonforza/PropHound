"use client";

import { useState, useEffect, useCallback } from "react";
import { GenerateBidLink } from "@/components/bids/generate-bid-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BidLineItem {
  id: string;
  description: string;
  amount: number;
  category: string | null;
}

interface Bid {
  id: string;
  gcCompany: string;
  gcName: string | null;
  gcEmail: string | null;
  gcPhone: string | null;
  totalAmount: number;
  notes: string | null;
  status: string;
  submittedAt: string;
  lineItems: BidLineItem[];
}

interface BidListProps {
  projectId: string;
}

const STATUS_OPTIONS = ["Submitted", "Under Review", "Accepted", "Rejected"];

export function BidList({ projectId }: BidListProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBid, setExpandedBid] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/bids`);
      if (!res.ok) throw new Error("Failed to fetch bids");
      const data = await res.json();
      setBids(data.bids);
    } catch {
      toast({ title: "Error", description: "Failed to load bids", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const updateStatus = async (bidId: string, status: string) => {
    try {
      const res = await fetch(`/api/bids/${bidId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: `Bid marked as ${status}` });
      fetchBids();
    } catch {
      toast({ title: "Error", description: "Failed to update bid status", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Bids ({bids.length})</h2>
        <GenerateBidLink projectId={projectId} onCreated={fetchBids} />
      </div>

      {bids.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            No bids submitted yet. Generate a bid link and share it with a GC.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>GC Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bids.map((bid) => (
                <>
                  <TableRow
                    key={bid.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedBid(expandedBid === bid.id ? null : bid.id)
                    }
                  >
                    <TableCell>
                      {expandedBid === bid.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{bid.gcCompany}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {bid.gcName && <div>{bid.gcName}</div>}
                        {bid.gcEmail && (
                          <div className="text-muted-foreground">{bid.gcEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bid.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={bid.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(bid.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {STATUS_OPTIONS.filter((s) => s !== bid.status).map(
                          (status) => (
                            <Button
                              key={status}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => updateStatus(bid.id, status)}
                            >
                              {status}
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedBid === bid.id && (
                    <TableRow key={`${bid.id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-3">
                          {bid.gcPhone && (
                            <p className="text-sm text-muted-foreground">
                              Phone: {bid.gcPhone}
                            </p>
                          )}
                          {bid.notes && (
                            <div>
                              <p className="text-sm font-medium mb-1">Notes:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {bid.notes}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Line Items ({bid.lineItems.length})
                            </p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bid.lineItems.map((li) => (
                                  <TableRow key={li.id}>
                                    <TableCell>{li.description}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {li.category || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(li.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="font-semibold border-t-2">
                                  <TableCell colSpan={2}>Total</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(bid.totalAmount)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
