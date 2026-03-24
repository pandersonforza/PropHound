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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { Project, CategorySummary } from "@/types";

export function CostSummaryReport() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [categories, setCategories] = useState<CategorySummary[]>([]);
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
      return;
    }
    setIsLoading(true);
    fetch(`/api/analytics/project/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => setCategories(data.categorySummaries || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedProjectId]);

  // Group by categoryGroup for subtotals
  const groups = new Map<string, CategorySummary[]>();
  for (const cat of categories) {
    const existing = groups.get(cat.categoryGroup) || [];
    existing.push(cat);
    groups.set(cat.categoryGroup, existing);
  }

  const chartData = Array.from(groups.entries()).map(([name, cats]) => ({
    name,
    original: cats.reduce((s, c) => s + c.originalBudget, 0),
    revised: cats.reduce((s, c) => s + c.revisedBudget, 0),
    actual: cats.reduce((s, c) => s + c.actualCost, 0),
  }));

  const totals = categories.reduce(
    (acc, c) => ({
      original: acc.original + c.originalBudget,
      revised: acc.revised + c.revisedBudget,
      committed: acc.committed + c.committedCost,
      actual: acc.actual + c.actualCost,
    }),
    { original: 0, revised: 0, committed: 0, actual: 0 }
  );

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

      {selectedProjectId && !isLoading && categories.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Category Group</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: "#d1d5db", fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: "#d1d5db", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="original" name="Original" fill="#3a4550" stackId="a" />
                  <Bar dataKey="revised" name="Revised" fill="#2a9a9a" stackId="b" />
                  <Bar dataKey="actual" name="Actual" fill="#1a7a7a" stackId="c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Revised</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(groups.entries()).map(([groupName, cats]) => {
                    const groupTotals = cats.reduce(
                      (acc, c) => ({
                        original: acc.original + c.originalBudget,
                        revised: acc.revised + c.revisedBudget,
                        committed: acc.committed + c.committedCost,
                        actual: acc.actual + c.actualCost,
                      }),
                      { original: 0, revised: 0, committed: 0, actual: 0 }
                    );
                    return (
                      <>
                        <TableRow key={groupName} className="bg-muted/50 font-medium">
                          <TableCell>{groupName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotals.original)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotals.revised)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotals.committed)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotals.actual)}</TableCell>
                        </TableRow>
                        {cats.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="pl-8">{cat.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.originalBudget)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.revisedBudget)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.committedCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.actualCost)}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.original)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.revised)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.committed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.actual)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {selectedProjectId && !isLoading && categories.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No budget data for this project.</p>
      )}
    </div>
  );
}
