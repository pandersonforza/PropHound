import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getVariance(
  revised: number,
  actual: number
): { amount: number; percent: number; isOver: boolean } {
  const amount = actual - revised;
  const percent = revised !== 0 ? (amount / revised) * 100 : 0;
  return {
    amount,
    percent,
    isOver: amount > 0,
  };
}
