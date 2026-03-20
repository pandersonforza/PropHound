"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { BudgetOverview } from "@/components/budget/budget-overview";
import { BudgetTable } from "@/components/budget/budget-table";
import { BudgetImport } from "@/components/budget/budget-import";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload } from "lucide-react";
import type { BudgetCategoryWithLineItems, BudgetSummary, CategorySummary } from "@/types";

export default function BudgetPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [categories, setCategories] = useState<BudgetCategoryWithLineItems[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectRes, analyticsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/analytics/project/${projectId}`),
      ]);

      if (!projectRes.ok) throw new Error("Failed to fetch project data");

      const projectData = await projectRes.json();
      setCategories(projectData.budgetCategories || []);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setSummary(analyticsData.budgetSummary || null);
        setCategorySummaries(analyticsData.categorySummaries || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load budget data: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import from Excel
        </Button>
      </div>
      {summary && (
        <BudgetOverview summary={summary} categorySummaries={categorySummaries} />
      )}
      <BudgetTable projectId={projectId} categories={categories} onMutate={fetchData} />
      <BudgetImport
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
        onSuccess={fetchData}
      />
    </div>
  );
}
