"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CategorySummary } from "@/types";

interface VarianceChartProps {
  categorySummaries: CategorySummary[];
}

export function VarianceChart({ categorySummaries }: VarianceChartProps) {
  // Group by categoryGroup
  const groupMap = new Map<string, { original: number; revised: number; actual: number }>();
  for (const cat of categorySummaries) {
    const existing = groupMap.get(cat.categoryGroup) || { original: 0, revised: 0, actual: 0 };
    existing.original += cat.originalBudget;
    existing.revised += cat.revisedBudget;
    existing.actual += cat.actualCost;
    groupMap.set(cat.categoryGroup, existing);
  }

  const data = Array.from(groupMap.entries()).map(([name, values]) => ({
    name,
    original: values.original,
    revised: values.revised,
    actual: values.actual,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Variance by Category Group</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "0.375rem",
                color: "var(--color-foreground)",
              }}
            />
            <Legend />
            <Bar dataKey="original" name="Original" fill="#3a4550" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revised" name="Revised" fill="#2a9a9a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="#1a7a7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
