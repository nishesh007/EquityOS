import { MetricCard } from "@/components/ui/MetricCard";
import type { CompanyFinancials, DataTransparency } from "@/types";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";

interface FinancialSummaryCardsProps {
  financials: CompanyFinancials;
  dataTransparency?: DataTransparency;
}

export function FinancialSummaryCards({ financials, dataTransparency }: FinancialSummaryCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <MetricCard
        label="Revenue"
        value={financials.revenue}
        growth={financials.revenueGrowth}
        subValue="YoY"
      />
      <MetricCard
        label="Net Profit"
        value={financials.netProfit}
        growth={financials.netProfitGrowth}
        subValue="YoY"
      />
      <MetricCard label="ROE" value={`${financials.roe}%`} />
      <MetricCard label="ROCE" value={`${financials.roce}%`} />
      <MetricCard label="P/E" value={`${financials.pe}x`} />
      <MetricCard label="P/B" value={`${financials.pb}x`} />
      <MetricCard
        label="Debt/Equity"
        value={`${financials.debtToEquity}x`}
      />
      </div>
      {dataTransparency && <DataTransparencyBar transparency={dataTransparency} compact />}
    </div>
  );
}
