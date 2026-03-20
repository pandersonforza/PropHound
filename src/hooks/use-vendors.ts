"use client";

import { useState, useEffect, useCallback } from "react";
import type { Vendor } from "@/types";

interface UseVendorsReturn {
  vendors: Vendor[];
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useVendors(): UseVendorsReturn {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return { vendors, isLoading, error, mutate: fetchVendors };
}
