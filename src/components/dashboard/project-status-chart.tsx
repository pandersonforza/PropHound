"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PROJECT_STAGES } from "@/lib/constants";

interface ChartData {
  name: string;
  value: number;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  Active: "#10b981",
  "On Hold": "#f59e0b",
  Completed: "#3b82f6",
  Dead: "#ef4444",
};

const STAGE_CHART_COLORS: Record<string, string> = {
  "Pre-Development": "#64748b",
  Design: "#a78bfa",
  Permitting: "#fbbf24",
  Construction: "#34d399",
  Closeout: "#60a5fa",
};

function MiniPieChart({
  title,
  data,
  colorMap,
  labelKey,
  activeFilter,
  onLegendClick,
}: {
  title: string;
  data: ChartData[];
  colorMap: Record<string, string>;
  labelKey: string;
  activeFilter: string | null;
  onLegendClick: (name: string) => void;
}) {
  // Dim non-active slices when a filter is active
  const pieData = data.map((d) => ({
    ...d,
    fill: activeFilter && activeFilter !== d.name
      ? (colorMap[d.name] || "#94a3b8") + "40"
      : (colorMap[d.name] || "#94a3b8"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {activeFilter && (
            <span className="text-xs font-normal text-muted-foreground">
              — {activeFilter}
              <button
                onClick={() => onLegendClick(activeFilter)}
                className="ml-1 text-primary hover:underline"
              >
                ✕
              </button>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-[200px] h-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  onClick={(entry) => entry?.name && onLegendClick(entry.name as string)}
                  style={{ cursor: "pointer" }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
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
                  <th className="text-left py-1.5 font-medium text-muted-foreground">{labelKey}</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => {
                  const isActive = activeFilter === entry.name;
                  const isDimmed = activeFilter && !isActive;
                  return (
                    <tr
                      key={entry.name}
                      onClick={() => onLegendClick(entry.name)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                        isActive ? "bg-primary/10" : "hover:bg-muted/40"
                      } ${isDimmed ? "opacity-40" : ""}`}
                    >
                      <td className="py-1.5 flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: colorMap[entry.name] || "#94a3b8" }}
                        />
                        <span className={isActive ? "font-medium" : ""}>{entry.name}</span>
                      </td>
                      <td className="text-right py-1.5 font-medium">{entry.value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectStatusChart({
  group,
  activeStatusFilter,
  activeStageFilter,
  onStatusClick,
  onStageClick,
}: {
  group?: string;
  activeStatusFilter?: string | null;
  activeStageFilter?: string | null;
  onStatusClick?: (status: string) => void;
  onStageClick?: (stage: string) => void;
}) {
  const [statusData, setStatusData] = useState<ChartData[]>([]);
  const [stageData, setStageData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        let projects: { status: string; stage: string; projectGroup: string }[] = await res.json();
        if (group && group !== "All") {
          projects = projects.filter((p) => p.projectGroup === group);
        }

        const statusCounts: Record<string, number> = {};
        const stageCounts: Record<string, number> = {};

        for (const p of projects) {
          statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
          if (p.status === "Active") {
            stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
          }
        }

        setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
        setStageData(
          PROJECT_STAGES
            .filter((s) => stageCounts[s] !== undefined)
            .map((s) => ({ name: s, value: stageCounts[s] }))
        );
      } catch {
        // silently handle
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [group]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{i === 0 ? "Projects by Status" : "Active Projects by Stage"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MiniPieChart
        title="Projects by Status"
        data={statusData}
        colorMap={STATUS_CHART_COLORS}
        labelKey="Status"
        activeFilter={activeStatusFilter ?? null}
        onLegendClick={onStatusClick ?? (() => {})}
      />
      {stageData.length > 0 && (
        <MiniPieChart
          title="Active Projects by Stage"
          data={stageData}
          colorMap={STAGE_CHART_COLORS}
          labelKey="Stage"
          activeFilter={activeStageFilter ?? null}
          onLegendClick={onStageClick ?? (() => {})}
        />
      )}
    </div>
  );
}
