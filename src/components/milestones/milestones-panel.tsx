"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MilestoneForm } from "./milestone-form";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  devFee: number;
  paidAmount: number;
  expectedDate: string | null;
  completedDate: string | null;
  status: string;
  sortOrder: number;
}

interface MilestonesPanelProps {
  projectId: string;
}

const PIE_COLORS = ["#10b981", "#64748b"];

export function MilestonesPanel({ projectId }: MilestonesPanelProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { canEdit } = useAuth();

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/milestones?projectId=${projectId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMilestones(data);
    } catch {
      toast({ title: "Error", description: "Failed to load milestones", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/milestones/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Milestone deleted" });
      fetchMilestones();
    } catch {
      toast({ title: "Error", description: "Failed to delete milestone", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    const newStatus = milestone.status === "Completed" ? "Pending" : "Completed";
    const completedDate = newStatus === "Completed" ? new Date().toISOString() : null;
    const paidAmount = newStatus === "Completed" ? milestone.devFee : 0;

    try {
      const res = await fetch(`/api/milestones/${milestone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completedDate, paidAmount }),
      });
      if (!res.ok) throw new Error();
      fetchMilestones();
    } catch {
      toast({ title: "Error", description: "Failed to update milestone", variant: "destructive" });
    }
  };

  const handleUploadAgreement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/milestones/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process agreement");
      }

      const data = await res.json();

      if (!data.milestones || data.milestones.length === 0) {
        toast({
          title: "No milestones found",
          description: data.notes || "The AI could not find milestone data in this document.",
          variant: "destructive",
        });
        return;
      }

      let created = 0;
      for (let i = 0; i < data.milestones.length; i++) {
        const m = data.milestones[i];
        const createRes = await fetch("/api/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: m.name,
            description: m.description || null,
            devFee: m.devFee || 0,
            expectedDate: m.expectedDate || null,
            status: "Pending",
            sortOrder: i,
          }),
        });
        if (createRes.ok) created++;
      }

      toast({
        title: "Agreement processed",
        description: `Created ${created} milestones from the dev agreement.${data.totalDevFee ? ` Total dev fee: ${formatCurrency(data.totalDevFee)}` : ""}`,
      });

      fetchMilestones();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process agreement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Compute summary stats
  const totalExpectedFees = milestones.reduce((sum, m) => sum + m.devFee, 0);
  const totalPaid = milestones.reduce((sum, m) => sum + m.paidAmount, 0);
  const totalRemaining = totalExpectedFees - totalPaid;
  const completedCount = milestones.filter((m) => m.status === "Completed").length;
  const pendingCount = milestones.filter((m) => m.status === "Pending").length;

  const pieData = [
    { name: "Completed", value: completedCount },
    { name: "Pending", value: pendingCount },
  ].filter((d) => d.value > 0);

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading milestones...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Dev Fees</p>
            <p className="text-lg font-semibold">{formatCurrency(totalExpectedFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid to Date</p>
            <p className="text-lg font-semibold text-emerald-400">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold text-amber-400">{formatCurrency(totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-lg font-semibold">
              {completedCount} / {milestones.length} complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Status Chart */}
      {milestones.length > 0 && pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestone Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Milestones Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Milestones</CardTitle>
            {canEdit && (
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleUploadAgreement}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Processing..." : "Upload Dev Agreement"}
                </label>
                <Button
                  onClick={() => {
                    setEditMilestone(undefined);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No milestones yet. Click &quot;Add Milestone&quot; or upload a dev agreement to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 w-10"></th>
                    <th className="py-3 pr-4">Milestone</th>
                    <th className="py-3 pr-4 text-right">Dev Fee</th>
                    <th className="py-3 pr-4 text-right">Paid</th>
                    <th className="py-3 pr-4 text-right">Remaining</th>
                    <th className="py-3 pr-4">Expected Date</th>
                    <th className="py-3 pr-4">Completed</th>
                    <th className="py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => {
                    const isCompleted = m.status === "Completed";
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-border/50 hover:bg-muted/30 ${isCompleted ? "opacity-60" : ""}`}
                      >
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => canEdit && handleToggleComplete(m)}
                            className={`flex items-center justify-center ${canEdit ? "" : "cursor-default"}`}
                            title={!canEdit ? "" : isCompleted ? "Mark as pending" : "Mark as complete"}
                            disabled={!canEdit}
                          >
                            <div
                              className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isCompleted
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              {isCompleted && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <span className={`font-medium ${isCompleted ? "line-through" : ""}`}>
                              {m.name}
                            </span>
                            {m.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">
                          {formatCurrency(m.devFee)}
                        </td>
                        <td className="py-3 pr-4 text-right text-emerald-400">
                          {formatCurrency(m.paidAmount)}
                        </td>
                        <td className="py-3 pr-4 text-right text-amber-400">
                          {formatCurrency(m.devFee - m.paidAmount)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {m.expectedDate
                            ? new Date(m.expectedDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {m.completedDate
                            ? new Date(m.completedDate).toLocaleDateString()
                            : "—"}
                        </td>
                        {canEdit && (
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditMilestone(m);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteId(m.id);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/20 font-semibold">
                    <td className="py-3 pr-4"></td>
                    <td className="py-3 pr-4">Totals</td>
                    <td className="py-3 pr-4 text-right">{formatCurrency(totalExpectedFees)}</td>
                    <td className="py-3 pr-4 text-right text-emerald-400">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td className="py-3 pr-4 text-right text-amber-400">
                      {formatCurrency(totalRemaining)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MilestoneForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditMilestone(undefined);
        }}
        projectId={projectId}
        milestone={editMilestone}
        onSuccess={fetchMilestones}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Milestone"
        description="Are you sure you want to delete this milestone? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  );
}
