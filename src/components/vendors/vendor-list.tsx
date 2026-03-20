"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VendorForm } from "@/components/vendors/vendor-form";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Vendor } from "@/types";

interface VendorListProps {
  vendors: Vendor[];
  onMutate: () => void;
}

export function VendorList({ vendors, onMutate }: VendorListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/vendors/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vendor");
      toast({ title: "Vendor deleted" });
      onMutate();
    } catch {
      toast({ title: "Error", description: "Failed to delete vendor", variant: "destructive" });
    }
  };

  const columns: ColumnDef<Vendor, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "company", header: "Company" },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <StatusBadge status={row.original.category} />,
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditVendor(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Button
          onClick={() => {
            setEditVendor(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        searchKey="name"
        searchPlaceholder="Search vendors..."
      />

      <VendorForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditVendor(undefined);
        }}
        vendor={editVendor}
        onSuccess={onMutate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  );
}
