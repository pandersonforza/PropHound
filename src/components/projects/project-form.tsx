"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { PROJECT_STATUSES, PROJECT_STAGES, PROJECT_GROUPS } from "@/lib/constants";
import type { Project } from "@/types";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSuccess: () => void;
}

export function ProjectForm({ open, onOpenChange, project, onSuccess }: ProjectFormProps) {
  const isEdit = !!project;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    address: string;
    description: string;
    tenant: string;
    status: string;
    stage: string;
    projectGroup: string;
  }>({
    name: "",
    address: "",
    description: "",
    tenant: "",
    status: PROJECT_STATUSES[0],
    stage: PROJECT_STAGES[0],
    projectGroup: PROJECT_GROUPS[0],
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        address: project.address,
        description: project.description || "",
        tenant: project.tenant || "",
        status: project.status,
        stage: project.stage,
        projectGroup: project.projectGroup || PROJECT_GROUPS[0],
      });
    } else {
      setForm({
        name: "",
        address: "",
        description: "",
        tenant: "",
        status: PROJECT_STATUSES[0],
        stage: PROJECT_STAGES[0],
        projectGroup: PROJECT_GROUPS[0],
      });
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      name: form.name,
      address: form.address,
      description: form.description || undefined,
      tenant: form.tenant,
      status: form.status,
      stage: form.stage,
      projectGroup: form.projectGroup,
    };

    try {
      const url = isEdit ? `/api/projects/${project.id}` : "/api/projects";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save project");

      toast({ title: isEdit ? "Project updated" : "Project created" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectGroup">Group</Label>
              <select
                id="projectGroup"
                value={form.projectGroup}
                onChange={(e) => setForm({ ...form, projectGroup: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PROJECT_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Input
                id="tenant"
                value={form.tenant}
                onChange={(e) => setForm({ ...form, tenant: e.target.value })}
                placeholder="Enter tenant name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <select
                id="stage"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PROJECT_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
