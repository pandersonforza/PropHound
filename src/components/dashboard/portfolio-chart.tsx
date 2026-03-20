"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProjectBudgetData {
  name: string;
  budget: number;
  actual: number;
}

export function PortfolioChart() {
  const [data, setData] = useState<ProjectBudgetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/portfolio");
        if (!res.ok) return;
        const analytics = await res.json();
        const chartData: ProjectBudgetData[] = (analytics.topProjects || []).map(
          (p: { name: string; totalBudget: number; spent: number }) => ({
            name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
            budget: p.totalBudget,
            actual: p.spent,
          })
        );
        setData(chartData);
      } catch {
        // silently handle
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual by Project</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" tick={{ fill: "var(--color-muted-foreground)" }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" tick={{ fill: "var(--color-muted-foreground)" }} />
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
            <Bar dataKey="budget" name="Budget" fill="#2a9a9a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="#1a7a7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
