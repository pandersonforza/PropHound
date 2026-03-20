"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface StatusData {
  name: string;
  value: number;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  Active: "#10b981",
  "On Hold": "#f59e0b",
  Completed: "#3b82f6",
  Cancelled: "#ef4444",
};

export function ProjectStatusChart() {
  const [data, setData] = useState<StatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const projects = await res.json();
        const statusCounts: Record<string, number> = {};
        for (const p of projects) {
          statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        }
        setData(
          Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
        );
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
          <CardTitle>Projects by Status</CardTitle>
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
        <CardTitle>Projects by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-[200px] h-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_CHART_COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.375rem",
                    color: "var(--color-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.name} className="border-b border-border last:border-0">
                    <td className="py-1.5 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: STATUS_CHART_COLORS[entry.name] || "#94a3b8" }}
                      />
                      {entry.name}
                    </td>
                    <td className="text-right py-1.5 font-medium">{entry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
