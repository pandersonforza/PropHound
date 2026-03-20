"use client";

import { useParams } from "next/navigation";
import { ProjectNotes } from "@/components/projects/project-notes";

export default function NotesPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <ProjectNotes projectId={projectId} />;
}
