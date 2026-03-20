"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ContractForm } from "@/components/contracts/contract-form";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ContractWithVendor } from "@/types";

interface ContractListProps {
  projectId: string;
  contracts: ContractWithVendor[];
  onMutate: () => void;
}

export function ContractList({ projectId, contracts, onMutate }: ContractListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editContract, setEditContract] = useState<ContractWithVendor | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/contracts/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contract");
      toast({ title: "Contract deleted" });
      onMutate();
    } catch {
      toast({ title: "Error", description: "Failed to delete contract", variant: "destructive" });
    }
  };

  const columns: ColumnDef<ContractWithVendor, unknown>[] = [
    { accessorKey: "title", header: "Title" },
    {
      id: "vendor",
      header: "Vendor",
      accessorFn: (row) => row.vendor?.name || "N/A",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <CurrencyDisplay amount={row.original.amount} />,
    },
    { accessorKey: "type", header: "Type" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "startDate",
      header: "Start",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "End",
      cell: ({ row }) => row.original.endDate ? formatDate(row.original.endDate) : "-",
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
              setEditContract(row.original);
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
        <h2 className="text-2xl font-bold">Contracts</h2>
        <Button
          onClick={() => {
            setEditContract(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contract
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        searchKey="title"
        searchPlaceholder="Search contracts..."
      />

      <ContractForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditContract(undefined);
        }}
        projectId={projectId}
        contract={editContract}
        onSuccess={onMutate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contract"
        description="Are you sure you want to delete this contract?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      />
    </div>
  );
}
