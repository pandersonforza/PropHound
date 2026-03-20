"use client";

import { useProjects } from "@/hooks/use-projects";
import { ProjectList } from "@/components/projects/project-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const { projects, isLoading, error, mutate } = useProjects();

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Projects</h1>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load projects: {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <ProjectList projects={projects} onMutate={mutate} />
    </div>
  );
}
