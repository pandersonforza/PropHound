import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const barHeight = {
    sm: "h-4",
    md: "h-5",
    lg: "h-7",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold tracking-tight select-none",
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          "w-1 rounded-full bg-gradient-to-b from-primary to-primary/40",
          barHeight[size]
        )}
      />
      <span className="italic">
        <span className="text-foreground">Build</span><span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pr-1">Forza</span>
      </span>
    </span>
  );
}
