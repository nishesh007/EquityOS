"use client";

import {
  ResearchCardSection,
  ResearchMetricCard,
  scoreToTone,
} from "@/components/company/research-cards";
import { cn } from "@/lib/utils";
import {
  formatScore,
  formatScoreLabel,
} from "@/lib/format/research-numbers";
import type { DataTransparency, FinancialQualityAnalysis } from "@/types";
import {
  Banknote,
  Building2,
  CircleDollarSign,
  Landmark,
  Percent,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo } from "react";

interface FinancialQualityPanelProps {
  analysis: FinancialQualityAnalysis;
  dataTransparency: DataTransparency;
}

const ICON_MAP: Record<string, typeof TrendingUp> = {
  "revenue-growth": TrendingUp,
  "profit-growth": CircleDollarSign,
  "eps-growth": Percent,
  "operating-margin": Percent,
  "net-margin": Percent,
  roe: ShieldCheck,
  roce: TrendingUp,
  debt: Landmark,
  "interest-coverage": Landmark,
  "free-cash-flow": WalletCards,
  "working-capital": Banknote,
  "cash-conversion": Banknote,
  "promoter-holding": Building2,
  "institutional-holding": Users,
  "dividend-consistency": CircleDollarSign,
  "capital-allocation": WalletCards,
};

/** Preferred display order for quality cards. */
const PREFERRED_KEYS = [
  "revenue-growth",
  "profit-growth",
  "roe",
  "roce",
  "free-cash-flow",
  "debt",
  "dividend-consistency",
  "promoter-holding",
  "working-capital",
  "institutional-holding",
];

export function FinancialQualityPanel({
  analysis,
}: FinancialQualityPanelProps) {
  const cards = useMemo(() => {
    const byKey = new Map(analysis.scores.map((s) => [s.key, s]));
    const ordered = [
      ...PREFERRED_KEYS.map((k) => byKey.get(k)).filter(Boolean),
      ...analysis.scores.filter((s) => !PREFERRED_KEYS.includes(s.key)),
    ] as typeof analysis.scores;
    return ordered;
  }, [analysis.scores]);

  const overall = scoreToTone(analysis.overallScore);

  return (
    <ResearchCardSection
      title="Financial Quality"
      subtitle="Score cards across key quality metrics"
      badge={
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
            overall.tone === "positive"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : overall.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : overall.tone === "negative"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-400"
          )}
        >
          {formatScoreLabel(analysis.overallScore)} · {overall.verdict}
        </span>
      }
    >
      {cards.map((item) => {
        const { tone, verdict } = scoreToTone(item.score);
        const Icon = ICON_MAP[item.key] ?? ShieldCheck;
        return (
          <ResearchMetricCard
            key={item.key}
            title={item.label}
            value={formatScore(item.score)}
            verdict={verdict}
            tone={tone}
            icon={Icon}
          />
        );
      })}
    </ResearchCardSection>
  );
}
