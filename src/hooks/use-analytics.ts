"use client";

import { useState, useEffect, useCallback } from "react";
import type { PortfolioKPIs } from "@/types";

interface UsePortfolioAnalyticsReturn {
  data: PortfolioKPIs | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

export function usePortfolioAnalytics(): UsePortfolioAnalyticsReturn {
  const [data, setData] = useState<PortfolioKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, mutate: fetchData };
}

interface ProjectAnalyticsData {
  budgetSummary: {
    originalBudget: number;
    revisedBudget: number;
    committedCost: number;
    actualCost: number;
    variance: number;
    variancePercent: number;
    percentComplete: number;
  };
  categorySummaries: Array<{
    id: string;
    name: string;
    categoryGroup: string;
    originalBudget: number;
    revisedBudget: number;
    committedCost: number;
    actualCost: number;
    variance: number;
    variancePercent: number;
    lineItemCount: number;
  }>;
  recentDraws: Array<{
    id: string;
    drawNumber: number;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
  recentContracts: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
    vendor: { name: string };
  }>;
}

interface UseProjectAnalyticsReturn {
  data: ProjectAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useProjectAnalytics(projectId: string): UseProjectAnalyticsReturn {
  const [data, setData] = useState<ProjectAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/project/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, mutate: fetchData };
}
