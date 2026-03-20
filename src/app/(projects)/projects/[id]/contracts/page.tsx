"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ContractList } from "@/components/contracts/contract-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContractWithVendor } from "@/types";

export default function ContractsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [contracts, setContracts] = useState<ContractWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch contracts");
      const data = await res.json();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load contracts: {error}
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return <ContractList projectId={projectId} contracts={contracts} onMutate={fetchContracts} />;
}
