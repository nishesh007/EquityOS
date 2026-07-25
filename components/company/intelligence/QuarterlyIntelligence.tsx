import {
  ResearchCardSection,
  ResearchMetricCard,
} from "@/components/company/research-cards";
import {
  formatPercentValue,
  formatResearchMetric,
  toFixedTrimmed,
} from "@/lib/format/research-numbers";
import type { QuarterlyAnalysis } from "@/types";
import { BarChart3, Sparkles } from "lucide-react";

interface QuarterlyIntelligenceProps {
  quarterly: QuarterlyAnalysis;
}

export function QuarterlyIntelligence({
  quarterly,
}: QuarterlyIntelligenceProps) {
  const latest = quarterly.points.at(-1);

  if (!latest) {
    return (
      <p className="text-xs text-text-muted">No quarterly history available.</p>
    );
  }

  return (
    <ResearchCardSection
      title="Quarterly Results"
      subtitle={`${latest.quarter} · latest quarter snapshot`}
    >
      <ResearchMetricCard
        title="Revenue"
        value={formatResearchMetric(latest.revenue)}
        verdict={latest.revenueGrowth >= 0 ? "Growing" : "Soft"}
        tone={latest.revenueGrowth >= 0 ? "positive" : "negative"}
        icon={BarChart3}
      />
      <ResearchMetricCard
        title="Net Profit"
        value={formatResearchMetric(latest.profit)}
        verdict={latest.profitGrowth >= 0 ? "Growing" : "Soft"}
        tone={latest.profitGrowth >= 0 ? "positive" : "negative"}
        icon={BarChart3}
      />
      <ResearchMetricCard
        title="EPS"
        value={`₹${toFixedTrimmed(latest.eps, 2)}`}
        verdict="Latest"
        tone="neutral"
        icon={BarChart3}
      />
      <ResearchMetricCard
        title="Margin"
        value={formatPercentValue(latest.margin)}
        verdict={latest.quarter}
        tone="macro"
        icon={Sparkles}
      />
    </ResearchCardSection>
  );
}
