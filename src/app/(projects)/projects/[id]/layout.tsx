"use client";

import { useParams } from "next/navigation";
import { ProjectTabsNav } from "@/components/projects/project-tabs-nav";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="p-8">
      <ProjectTabsNav projectId={projectId} />
      {children}
    </div>
  );
}
