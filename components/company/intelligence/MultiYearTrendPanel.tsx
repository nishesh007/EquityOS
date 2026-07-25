import {
  ResearchCardSection,
  ResearchMetricCard,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import {
  formatByUnit,
} from "@/lib/format/research-numbers";
import type { DataTransparency, MultiYearTrendAnalysis } from "@/types";
import {
  Activity,
  CircleDollarSign,
  Landmark,
  Percent,
  TrendingUp,
  WalletCards,
} from "lucide-react";

interface MultiYearTrendPanelProps {
  trends: MultiYearTrendAnalysis;
  dataTransparency: DataTransparency;
}

const ICONS: Record<string, typeof TrendingUp> = {
  revenue: TrendingUp,
  profit: CircleDollarSign,
  eps: Percent,
  roe: Activity,
  roce: Activity,
  debt: Landmark,
  margins: Percent,
  fcf: WalletCards,
};

function directionTone(
  direction: "improving" | "deteriorating" | "stable",
  key: string
): ResearchCardTone {
  if (key === "debt") {
    if (direction === "deteriorating") return "positive";
    if (direction === "improving") return "negative";
    return "neutral";
  }
  if (direction === "improving") return "positive";
  if (direction === "deteriorating") return "negative";
  return "warning";
}

export function MultiYearTrendPanel({
  trends,
}: MultiYearTrendPanelProps) {
  return (
    <ResearchCardSection
      title="Multi-Year Trends"
      subtitle="5–10 year trajectory"
    >
      {trends.metrics.map((metric) => {
        const latest = metric.points.at(-1)?.value;
        const value =
          latest === undefined ? "—" : formatByUnit(latest, metric.unit);
        return (
          <ResearchMetricCard
            key={metric.key}
            title={metric.label}
            value={value}
            verdict={metric.direction}
            tone={directionTone(metric.direction, metric.key)}
            icon={ICONS[metric.key] ?? TrendingUp}
          />
        );
      })}
    </ResearchCardSection>
  );
}
