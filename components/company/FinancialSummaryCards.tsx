import { MetricCard } from "@/components/ui/MetricCard";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import {
  formatPercentValue,
  formatRatioValue,
  formatResearchMetric,
} from "@/lib/format/research-numbers";
import type { CompanyFinancials, DataTransparency } from "@/types";

interface FinancialSummaryCardsProps {
  financials: CompanyFinancials;
  dataTransparency?: DataTransparency;
}

export function FinancialSummaryCards({
  financials,
  dataTransparency,
}: FinancialSummaryCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MetricCard
          label="Revenue"
          value={formatResearchMetric(financials.revenue)}
          growth={financials.revenueGrowth}
          subValue="YoY"
        />
        <MetricCard
          label="Net Profit"
          value={formatResearchMetric(financials.netProfit)}
          growth={financials.netProfitGrowth}
          subValue="YoY"
        />
        <MetricCard label="ROE" value={formatPercentValue(financials.roe)} />
        <MetricCard label="ROCE" value={formatPercentValue(financials.roce)} />
        <MetricCard label="P/E" value={formatRatioValue(financials.pe)} />
        <MetricCard label="P/B" value={formatRatioValue(financials.pb)} />
        <MetricCard
          label="Debt/Equity"
          value={formatRatioValue(financials.debtToEquity)}
        />
      </div>
      {dataTransparency ? (
        <DataTransparencyBar transparency={dataTransparency} compact />
      ) : null}
    </div>
  );
}
