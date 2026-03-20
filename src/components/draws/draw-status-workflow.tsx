"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = ["Draft", "Submitted", "Approved", "Funded"];

interface DrawStatusWorkflowProps {
  currentStatus: string;
}

export function DrawStatusWorkflow({ currentStatus }: DrawStatusWorkflowProps) {
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between w-full max-w-md">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium",
                  isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 mx-2",
                  index < currentIndex ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
