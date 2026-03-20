"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";
import { Pencil, MapPin } from "lucide-react";
import { formatPercent } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectDetailHeaderProps {
  project: Project;
  budgetSummary?: {
    originalBudget: number;
    revisedBudget: number;
    committedCost: number;
    actualCost: number;
    variance: number;
    percentComplete: number;
  };
  onMutate: () => void;
}

export function ProjectDetailHeader({ project, budgetSummary, onMutate }: ProjectDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  const totalBudget = budgetSummary?.revisedBudget ?? project.totalBudget;
  const spent = budgetSummary?.actualCost ?? 0;
  const remaining = totalBudget - spent;
  const pctComplete = budgetSummary?.percentComplete ?? 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline transition-colors"
              >
                {project.address}
              </a>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={project.status} />
              <StatusBadge status={project.stage} type="stage" />
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <CurrencyDisplay amount={totalBudget} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Spent</p>
              <CurrencyDisplay amount={spent} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <CurrencyDisplay amount={remaining} size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">% Complete</p>
              <div className="text-lg font-semibold">{formatPercent(pctComplete)}</div>
              <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(pctComplete, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSuccess={onMutate}
      />
    </>
  );
}
