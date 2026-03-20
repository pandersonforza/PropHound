"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DocumentList } from "@/components/documents/document-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/types";

export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load documents: {error}
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return <DocumentList projectId={projectId} documents={documents} onMutate={fetchDocuments} />;
}
