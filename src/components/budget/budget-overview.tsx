"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { VarianceChart } from "@/components/budget/variance-chart";
import type { BudgetSummary, CategorySummary } from "@/types";

interface BudgetOverviewProps {
  summary: BudgetSummary;
  categorySummaries: CategorySummary[];
}

export function BudgetOverview({ summary, categorySummaries }: BudgetOverviewProps) {
  const cards = [
    { label: "Original Budget", amount: summary.originalBudget },
    { label: "Revised Budget", amount: summary.revisedBudget },
    { label: "Committed", amount: summary.committedCost },
    { label: "Actual Cost", amount: summary.actualCost },
    { label: "Variance", amount: summary.variance, isVariance: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.isVariance ? (
                <CurrencyDisplay amount={card.amount} showVariance baseAmount={0} size="lg" />
              ) : (
                <CurrencyDisplay amount={card.amount} size="lg" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <VarianceChart categorySummaries={categorySummaries} />
    </div>
  );
}
