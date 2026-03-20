"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DrawList } from "@/components/draws/draw-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { DrawRequestWithLineItems } from "@/types";

export default function DrawsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [draws, setDraws] = useState<DrawRequestWithLineItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDraws = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/draws?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch draws");
      const data = await res.json();
      setDraws(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDraws();
  }, [fetchDraws]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load draws: {error}
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return <DrawList projectId={projectId} draws={draws} onMutate={fetchDraws} />;
}
