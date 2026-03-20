"use client";

import { useState, useEffect, useCallback } from "react";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceWithRelations } from "@/types";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Invoices</h1>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load invoices: {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <InvoiceList invoices={invoices} onMutate={fetchInvoices} showProject />
    </div>
  );
}
