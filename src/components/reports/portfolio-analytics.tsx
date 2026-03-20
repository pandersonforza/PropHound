"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@/types";

const STATUS_CHART_COLORS: Record<string, string> = {
  Active: "#10b981",
  "On Hold": "#f59e0b",
  Completed: "#3b82f6",
  Cancelled: "#ef4444",
};

const STAGE_CHART_COLORS: Record<string, string> = {
  "Pre-Development": "#64748b",
  Design: "#8b5cf6",
  Permitting: "#f59e0b",
  Construction: "#10b981",
  Closeout: "#3b82f6",
};

export function PortfolioAnalytics() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
    );
  }

  // Budget by project bar chart
  const budgetData = projects
    .sort((a, b) => b.totalBudget - a.totalBudget)
    .map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name,
      budget: p.totalBudget,
    }));

  // Status donut
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Stage donut
  const stageCounts: Record<string, number> = {};
  for (const p of projects) {
    stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
  }
  const stageData = Object.entries(stageCounts).map(([name, value]) => ({ name, value }));

  // Spending by type stacked bar
  const typeData: Record<string, number> = {};
  for (const p of projects) {
    typeData[p.type] = (typeData[p.type] || 0) + p.totalBudget;
  }
  const spendingByType = Object.entries(typeData).map(([name, budget]) => ({
    name,
    budget,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Budget by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
              <YAxis type="category" dataKey="name" className="text-xs" width={100} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.375rem",
                  color: "var(--color-foreground)",
                }}
              />
              <Bar dataKey="budget" name="Budget" fill="#2a9a9a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingByType}>
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
              <Bar dataKey="budget" name="Total Budget" fill="#1a7a7a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stageData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {stageData.map((entry) => (
                  <Cell key={entry.name} fill={STAGE_CHART_COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
