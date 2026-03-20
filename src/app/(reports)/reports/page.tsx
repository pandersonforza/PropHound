"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CostSummaryReport } from "@/components/reports/cost-summary-report";
import { VarianceReport } from "@/components/reports/variance-report";
import { DrawHistoryReport } from "@/components/reports/draw-history-report";
import { PortfolioAnalytics } from "@/components/reports/portfolio-analytics";

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <Tabs defaultValue="cost-summary">
        <TabsList>
          <TabsTrigger value="cost-summary">Cost Summary</TabsTrigger>
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="draw-history">Draw History</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="cost-summary">
          <CostSummaryReport />
        </TabsContent>

        <TabsContent value="variance">
          <VarianceReport />
        </TabsContent>

        <TabsContent value="draw-history">
          <DrawHistoryReport />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
