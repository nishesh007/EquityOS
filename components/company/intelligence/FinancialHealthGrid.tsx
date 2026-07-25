import {
  ResearchCardSection,
  ResearchMetricCard,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import { formatResearchMetric } from "@/lib/format/research-numbers";
import type { DataTransparency, FinancialHealthMetric } from "@/types";
import {
  Activity,
  Banknote,
  CircleDollarSign,
  Gauge,
  Landmark,
  Percent,
  ReceiptIndianRupee,
  TrendingUp,
  WalletCards,
} from "lucide-react";

interface FinancialHealthGridProps {
  metrics: FinancialHealthMetric[];
  dataTransparency?: DataTransparency;
}

const metricIcons = {
  revenue: TrendingUp,
  profit: CircleDollarSign,
  eps: ReceiptIndianRupee,
  margin: Percent,
  roe: Gauge,
  roce: Activity,
  debt: Landmark,
  "cash-flow": Banknote,
  "free-cash-flow": WalletCards,
  "working-capital": Banknote,
};

function healthTone(metric: FinancialHealthMetric): ResearchCardTone {
  const constructive =
    metric.key === "debt" ? metric.trend !== "up" : metric.trend === "up";
  if (constructive) return "positive";
  if (metric.trend === "stable") return "neutral";
  return "negative";
}

export function FinancialHealthGrid({
  metrics,
}: FinancialHealthGridProps) {
  return (
    <ResearchCardSection
      title="Financial Health"
      subtitle="Growth · returns · balance sheet · cash"
    >
      {metrics.map((metric) => {
        const Icon =
          metricIcons[metric.key as keyof typeof metricIcons] ?? Activity;
        return (
          <ResearchMetricCard
            key={metric.key}
            title={metric.label}
            value={formatResearchMetric(metric.value)}
            verdict={metric.trendLabel}
            tone={healthTone(metric)}
            icon={Icon}
          />
        );
      })}
    </ResearchCardSection>
  );
}
