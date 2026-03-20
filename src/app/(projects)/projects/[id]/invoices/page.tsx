"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceWithRelations } from "@/types";

export default function ProjectInvoicesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load invoices: {error}
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <InvoiceList
      invoices={invoices}
      onMutate={fetchInvoices}
      showProject={false}
      projectId={projectId}
    />
  );
}
