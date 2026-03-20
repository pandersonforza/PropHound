import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STAGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "status" | "stage";
  className?: string;
}

export function StatusBadge({ status, type = "status", className }: StatusBadgeProps) {
  const colorMap = type === "stage" ? STAGE_COLORS : STATUS_COLORS;
  const colors = colorMap[status];

  if (!colors) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(colors.bg, colors.text, "border-transparent", className)}
    >
      {status}
    </Badge>
  );
}
