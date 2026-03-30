"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { DollarSign, TrendingUp, Building2, CheckCircle2 } from "lucide-react";
import type { PortfolioKPIs } from "@/types";

interface KPICardsProps {
  data: PortfolioKPIs;
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: "Total Budget",
      value: data.totalBudget,
      icon: DollarSign,
      subtitle: `${data.totalProjects} projects`,
    },
    {
      title: "Paid This Month",
      value: data.monthlyPaid ?? 0,
      icon: TrendingUp,
      subtitle: `Total spent: $${((data.totalActualCost || 0) / 1000000).toFixed(1)}M`,
    },
    {
      title: "Active Projects",
      value: null,
      count: data.activeProjects,
      icon: Building2,
      subtitle: `of ${data.totalProjects} total`,
    },
    {
      title: `Completed This Year`,
      value: null,
      count: data.completedThisYear ?? 0,
      icon: CheckCircle2,
      subtitle: `in ${new Date().getFullYear()}`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {card.value !== null ? (
              <CurrencyDisplay amount={card.value} size="lg" />
            ) : (
              <div className="text-2xl font-bold">{card.count}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
