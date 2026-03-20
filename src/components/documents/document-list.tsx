"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocumentForm } from "@/components/documents/document-form";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/types";

interface DocumentListProps {
  projectId: string;
  documents: Document[];
  onMutate: () => void;
}

export function DocumentList({ projectId, documents, onMutate }: DocumentListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/documents/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      toast({ title: "Document deleted" });
      onMutate();
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  };

  const columns: ColumnDef<Document, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <StatusBadge status={row.original.category} />,
    },
    {
      accessorKey: "uploadDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.uploadDate),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.notes || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setDeleteId(row.original.id);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Documents</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        searchKey="name"
        searchPlaceholder="Search documents..."
      />

      <DocumentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={projectId}
        onSuccess={onMutate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  );
}
