"use client";

import {
  ResearchCardSection,
  ResearchMetricCard,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import { formatResearchMetric } from "@/lib/format/research-numbers";
import type { DataTransparency, Opportunity, RedFlag } from "@/types";
import { ShieldAlert, Sparkles } from "lucide-react";
import { useMemo } from "react";

interface InvestmentSignalsPanelProps {
  flags: RedFlag[];
  opportunities: Opportunity[];
  dataTransparency: DataTransparency;
}

type SignalCard =
  | { kind: "opportunity"; item: Opportunity }
  | { kind: "flag"; item: RedFlag };

function severityTone(severity: string): ResearchCardTone {
  if (severity === "High") return "negative";
  if (severity === "Medium") return "warning";
  return "risk";
}

export function InvestmentSignalsPanel({
  flags,
  opportunities,
}: InvestmentSignalsPanelProps) {
  const cards = useMemo<SignalCard[]>(() => {
    return [
      ...opportunities.map((item) => ({ kind: "opportunity" as const, item })),
      ...flags.map((item) => ({ kind: "flag" as const, item })),
    ];
  }, [flags, opportunities]);

  return (
    <ResearchCardSection
      title="Investment Signals"
      subtitle="Positive and risk findings"
      badge={
        <span className="rounded-md border border-surface-border-subtle bg-surface-overlay/40 px-2 py-0.5 text-[10px] font-medium text-text-muted">
          {opportunities.length} positive · {flags.length} risk
        </span>
      }
    >
      {cards.length === 0 ? (
        <p className="col-span-full text-xs text-text-muted">
          No material risk or opportunity signals in current data.
        </p>
      ) : (
        cards.map((card) => {
          if (card.kind === "opportunity") {
            const id = `opp-${card.item.key}`;
            return (
              <ResearchMetricCard
                key={id}
                title={card.item.label}
                value={formatResearchMetric(card.item.metric)}
                verdict="Opportunity"
                tone="positive"
                icon={Sparkles}
              />
            );
          }
          const id = `flag-${card.item.key}`;
          return (
            <ResearchMetricCard
              key={id}
              title={card.item.label}
              value={formatResearchMetric(card.item.metric)}
              verdict={card.item.severity}
              tone={severityTone(card.item.severity)}
              icon={ShieldAlert}
            />
          );
        })
      )}
    </ResearchCardSection>
  );
}
