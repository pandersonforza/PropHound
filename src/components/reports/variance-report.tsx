"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Project, CategorySummary, BudgetSummary } from "@/types";

export function VarianceReport() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setCategories([]);
      setSummary(null);
      return;
    }
    setIsLoading(true);
    fetch(`/api/analytics/project/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categorySummaries || []);
        setSummary(data.budgetSummary || null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedProjectId]);

  const overBudgetCount = categories.filter((c) => c.actualCost > c.revisedBudget).length;
  const underBudgetCount = categories.filter((c) => c.actualCost <= c.revisedBudget && c.actualCost > 0).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose a project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <Skeleton className="h-[400px]" />}

      {selectedProjectId && !isLoading && summary && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Variance</p>
                <CurrencyDisplay amount={summary.variance} showVariance baseAmount={0} size="lg" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Over Budget Categories</p>
                <div className="text-2xl font-bold text-red-600">{overBudgetCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Under/On Budget Categories</p>
                <div className="text-2xl font-bold text-emerald-600">{underBudgetCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Variance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Revised Budget</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => {
                    const variance = cat.actualCost - cat.revisedBudget;
                    const pct = cat.revisedBudget > 0 ? (variance / cat.revisedBudget) * 100 : 0;
                    const isOver = variance > 0;
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>{cat.categoryGroup}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.revisedBudget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.actualCost)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(isOver ? "text-red-600" : "text-emerald-600")}>
                            {isOver ? "+" : ""}{formatCurrency(variance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(isOver ? "text-red-600" : "text-emerald-600")}>
                            {formatPercent(pct)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {selectedProjectId && !isLoading && !summary && (
        <p className="text-muted-foreground text-center py-12">No budget data for this project.</p>
      )}
    </div>
  );
}
