"use client";

import {
  ResearchCardSection,
  ResearchMetricCard,
  verdictToTone,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import { formatPrice, cn } from "@/lib/utils";
import {
  formatPercentValue,
} from "@/lib/format/research-numbers";
import type {
  DataTransparency,
  ValuationAnalysis,
  ValuationVerdict,
} from "@/types";
import {
  Gauge,
  Landmark,
  Percent,
  Scale,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, type ComponentType } from "react";

interface ValuationAnalysisPanelProps {
  valuation: ValuationAnalysis;
  dataTransparency: DataTransparency;
}

const verdictStyles: Record<ValuationVerdict, string> = {
  Undervalued: "text-gain bg-gain-bg border-gain/20",
  "Fairly Valued": "text-accent bg-accent/10 border-accent/20",
  Overvalued: "text-loss bg-loss-bg border-loss/20",
};

function formatPct(value: number, available: boolean): string {
  if (!available || !Number.isFinite(value)) return "N/A";
  return formatPercentValue(value, { signed: true });
}

type CardDef = {
  id: string;
  title: string;
  value: string;
  verdict: string;
  tone: ResearchCardTone;
  icon: ComponentType<{ className?: string }>;
};

export function ValuationAnalysisPanel({
  valuation,
}: ValuationAnalysisPanelProps) {
  const cards = useMemo(() => {
    const modelIcon: Record<string, ComponentType<{ className?: string }>> = {
      dcf: Target,
      graham: Scale,
      epv: Sparkles,
      "relative-pe": Percent,
      "relative-pb": Percent,
      "ev-ebitda": Gauge,
      "sector-comparison": Landmark,
    };

    const modelTitle: Record<string, string> = {
      dcf: "DCF",
      graham: "Graham",
      epv: "Buffett / EPV",
      "relative-pe": "Relative PE",
      "relative-pb": "Relative PB",
      "ev-ebitda": "EV/EBITDA",
      "sector-comparison": "Sector",
    };

    const modelCards: CardDef[] = valuation.models.map((model) => ({
      id: `model-${model.key}`,
      title: modelTitle[model.key] ?? model.label,
      value: formatPrice(model.fairValue, 0),
      verdict: model.verdict,
      tone: verdictToTone(model.verdict),
      icon: modelIcon[model.key] ?? Scale,
    }));

    const summaryCards: CardDef[] = [
      {
        id: "fair-value",
        title: "Fair Value",
        value: formatPrice(valuation.estimatedFairValue, 0),
        verdict: valuation.overallVerdict,
        tone: verdictToTone(valuation.overallVerdict),
        icon: Target,
      },
      {
        id: "intrinsic",
        title: "Intrinsic Value",
        value: formatPrice(valuation.intrinsicValue, 0),
        verdict: valuation.overallVerdict,
        tone: "valuation",
        icon: Scale,
      },
      {
        id: "mos",
        title: "Margin of Safety",
        value: formatPct(valuation.marginOfSafety, valuation.available),
        verdict:
          valuation.available && valuation.marginOfSafety > 10
            ? "Attractive"
            : valuation.available && valuation.marginOfSafety < 0
              ? "Stretched"
              : "Neutral",
        tone:
          valuation.available && valuation.marginOfSafety > 10
            ? "positive"
            : valuation.available && valuation.marginOfSafety < 0
              ? "negative"
              : "warning",
        icon: Shield,
      },
    ];

    // Prefer DCF, Graham, EPV/Buffett, Relative PE first, then MoS/FV/IV
    const preferred = ["dcf", "graham", "epv", "relative-pe"];
    const sortedModels = [
      ...preferred
        .map((k) => modelCards.find((c) => c.id === `model-${k}`))
        .filter(Boolean),
      ...modelCards.filter(
        (c) => !preferred.some((k) => c.id === `model-${k}`)
      ),
    ] as CardDef[];

    return [...sortedModels.slice(0, 4), ...summaryCards];
  }, [valuation]);

  return (
    <ResearchCardSection
      title="Valuation"
      subtitle="Models · fair value · margin of safety"
      badge={
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            verdictStyles[valuation.overallVerdict]
          )}
        >
          {valuation.overallVerdict}
        </span>
      }
    >
      {cards.map((card) => (
        <ResearchMetricCard
          key={card.id}
          title={card.title}
          value={card.value}
          verdict={card.verdict}
          tone={card.tone}
          icon={card.icon}
        />
      ))}
    </ResearchCardSection>
  );
}
