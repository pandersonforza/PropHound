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
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Project, DrawRequestWithLineItems } from "@/types";

export function DrawHistoryReport() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [draws, setDraws] = useState<DrawRequestWithLineItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setDraws([]);
      return;
    }
    setIsLoading(true);
    fetch(`/api/draws?projectId=${selectedProjectId}`)
      .then((r) => r.json())
      .then(setDraws)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedProjectId]);

  // Build cumulative chart data
  let cumulative = 0;
  const chartData = draws
    .sort((a, b) => a.drawNumber - b.drawNumber)
    .map((draw) => {
      cumulative += draw.totalAmount;
      return {
        name: `Draw #${draw.drawNumber}`,
        amount: draw.totalAmount,
        cumulative,
      };
    });

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

      {selectedProjectId && !isLoading && draws.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Draws</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: "#d1d5db", fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: "#d1d5db", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === "cumulative" ? "Cumulative" : "This Draw",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#2a9a9a"
                    fill="#2a9a9a"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Draw Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Draw #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Funded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws
                    .sort((a, b) => a.drawNumber - b.drawNumber)
                    .map((draw) => (
                      <TableRow key={draw.id}>
                        <TableCell className="font-medium">#{draw.drawNumber}</TableCell>
                        <TableCell>
                          <StatusBadge status={draw.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={draw.totalAmount} />
                        </TableCell>
                        <TableCell>
                          {draw.submittedDate ? formatDate(draw.submittedDate) : "-"}
                        </TableCell>
                        <TableCell>
                          {draw.approvedDate ? formatDate(draw.approvedDate) : "-"}
                        </TableCell>
                        <TableCell>
                          {draw.fundedDate ? formatDate(draw.fundedDate) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {selectedProjectId && !isLoading && draws.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No draws for this project.</p>
      )}
    </div>
  );
}
