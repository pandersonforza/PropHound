"use client";

import { useVendors } from "@/hooks/use-vendors";
import { VendorList } from "@/components/vendors/vendor-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorsPage() {
  const { vendors, isLoading, error, mutate } = useVendors();

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Vendors</h1>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load vendors: {error}
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
      <VendorList vendors={vendors} onMutate={mutate} />
    </div>
  );
}
