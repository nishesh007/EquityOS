"use client";

import { AskAIButton } from "@/components/ai/AskAIButton";
import {
  ResearchCardSection,
  ResearchMetricCard,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import {
  formatPriceValue,
  formatResearchMetric,
  formatScore,
} from "@/lib/format/research-numbers";
import type { Signal, TechnicalAnalysis, TechnicalIndicator } from "@/types";
import {
  Activity,
  BarChart3,
  Crosshair,
  LineChart,
  Waves,
  Wind,
} from "lucide-react";
import { useMemo, type ComponentType } from "react";

interface TechnicalIndicatorsPanelProps {
  symbol: string;
  technicals: TechnicalAnalysis;
  support?: number;
  resistance?: number;
}

type TechGroupId =
  | "trend"
  | "momentum"
  | "moving-averages"
  | "volume"
  | "support"
  | "resistance"
  | "volatility"
  | "other";

interface TechGroup {
  id: TechGroupId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  match: (name: string) => boolean;
}

const GROUPS: TechGroup[] = [
  {
    id: "trend",
    title: "Trend",
    icon: LineChart,
    match: (n) =>
      /supertrend|adx|relative strength|52 week/i.test(n) &&
      !/momentum/i.test(n),
  },
  {
    id: "momentum",
    title: "Momentum",
    icon: Waves,
    match: (n) => /rsi|macd|momentum|histogram|signal line/i.test(n),
  },
  {
    id: "moving-averages",
    title: "Moving Averages",
    icon: Activity,
    match: (n) => /ema|sma/i.test(n),
  },
  {
    id: "volume",
    title: "Volume",
    icon: BarChart3,
    match: (n) => /volume|vwap/i.test(n),
  },
  {
    id: "volatility",
    title: "Volatility",
    icon: Wind,
    match: (n) => /atr|volatility|bollinger/i.test(n),
  },
];

function signalTone(signal: Signal): ResearchCardTone {
  if (signal === "bullish") return "positive";
  if (signal === "bearish") return "negative";
  return "technical";
}

function majoritySignal(indicators: TechnicalIndicator[]): Signal {
  const counts = { bullish: 0, neutral: 0, bearish: 0 };
  for (const i of indicators) counts[i.signal] += 1;
  if (counts.bullish >= counts.bearish && counts.bullish >= counts.neutral) {
    return "bullish";
  }
  if (counts.bearish >= counts.bullish && counts.bearish >= counts.neutral) {
    return "bearish";
  }
  return "neutral";
}

export function TechnicalIndicatorsPanel({
  symbol,
  technicals,
  support,
  resistance,
}: TechnicalIndicatorsPanelProps) {
  const groupCards = useMemo(() => {
    const used = new Set<string>();
    const cards = GROUPS.map((group) => {
      const indicators = technicals.indicators.filter((i) => {
        if (!group.match(i.name)) return false;
        used.add(i.name);
        return true;
      });
      return { group, indicators };
    }).filter((c) => c.indicators.length > 0);

    const leftover = technicals.indicators.filter((i) => !used.has(i.name));
    if (leftover.length > 0) {
      cards.push({
        group: {
          id: "other" as TechGroupId,
          title: "Other Signals",
          icon: Activity,
          match: () => true,
        },
        indicators: leftover,
      });
    }

    return cards;
  }, [technicals.indicators]);

  const levelCards = [
    support !== undefined && support > 0
      ? {
          id: "support" as const,
          title: "Support",
          value: formatPriceValue(support),
          verdict: "Level",
          tone: "positive" as ResearchCardTone,
        }
      : null,
    resistance !== undefined && resistance > 0
      ? {
          id: "resistance" as const,
          title: "Resistance",
          value: formatPriceValue(resistance),
          verdict: "Level",
          tone: "negative" as ResearchCardTone,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: "support" | "resistance";
    title: string;
    value: string;
    verdict: string;
    tone: ResearchCardTone;
  }>;

  return (
    <ResearchCardSection
      title="Technical Analysis"
      subtitle="Indicator groups and key levels"
      badge={
        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-400">
          Score {formatScore(technicals.score)}
        </span>
      }
      actions={
        <AskAIButton
          symbol={symbol}
          pageContext="company"
          variant="chip"
          explainTarget={{
            type: "score",
            key: "technical-score",
            label: "Technical Score",
            value: Math.round(technicals.score),
            symbol,
            pageContext: "company",
            detail: `${technicals.bullishCount} bullish, ${technicals.bearishCount} bearish indicators`,
          }}
        />
      }
    >
      <ResearchMetricCard
        title="Overall"
        value={formatScore(technicals.score)}
        verdict={technicals.summary}
        tone={signalTone(technicals.summary)}
        icon={Activity}
      />
      {groupCards.map(({ group, indicators }) => {
        const signal = majoritySignal(indicators);
        const primary = indicators[0];
        return (
          <ResearchMetricCard
            key={group.id}
            title={group.title}
            value={formatResearchMetric(primary?.value ?? "—")}
            verdict={signal}
            tone={signalTone(signal)}
            icon={group.icon}
          />
        );
      })}
      {levelCards.map((card) => (
        <ResearchMetricCard
          key={card.id}
          title={card.title}
          value={card.value}
          verdict={card.verdict}
          tone={card.tone}
          icon={Crosshair}
        />
      ))}
    </ResearchCardSection>
  );
}
