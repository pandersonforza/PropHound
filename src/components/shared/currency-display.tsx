import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  showVariance?: boolean;
  baseAmount?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CurrencyDisplay({
  amount,
  showVariance = false,
  baseAmount,
  className,
  size = "md",
}: CurrencyDisplayProps) {
  const variance =
    showVariance && baseAmount !== undefined ? amount - baseAmount : null;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn(sizeClasses[size])}>{formatCurrency(amount)}</span>
      {variance !== null && variance !== 0 && (
        <span
          className={cn(
            "text-xs font-medium",
            variance > 0 ? "text-red-600" : "text-emerald-600"
          )}
        >
          ({variance > 0 ? "+" : ""}
          {formatCurrency(variance)})
        </span>
      )}
    </span>
  );
}
