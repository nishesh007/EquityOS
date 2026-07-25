"use client";

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useMemo } from "react";
import { buildExecutiveDecisionView } from "@/lib/recommendations/executive-decision-presenter";
import { AiConvictionSection } from "./AiConvictionSection";
import { CommitteeVerdictSection } from "./CommitteeVerdictSection";
import { ExecutiveSummarySection } from "./ExecutiveSummarySection";
import { SectionShell } from "./SectionChrome";
import { TradePlanSection } from "./TradePlanSection";
import type { RecommendationDetailContext } from "./types";

export interface RecommendationSectionMeta {
  id: string;
  title: string;
  description: string;
}

/** Remaining placeholder sections — Sprint 11A.3+. */
export const RECOMMENDATION_DRAWER_PLACEHOLDER_SECTIONS: readonly RecommendationSectionMeta[] =
  [
    {
      id: "technical-summary",
      title: "Technical Summary",
      description:
        "Price structure, momentum, and technical framework alignment.",
    },
    {
      id: "fundamental-summary",
      title: "Fundamental Summary",
      description: "Quality, growth, and fundamental framework highlights.",
    },
    {
      id: "valuation-summary",
      title: "Valuation Summary",
      description:
        "Relative and absolute valuation context versus peers and history.",
    },
    {
      id: "risk-analysis",
      title: "Risk Analysis",
      description:
        "Downside scenarios, risk mode, and invalidation conditions.",
    },
    {
      id: "catalysts",
      title: "Catalysts",
      description:
        "Near-term and structural catalysts that could reprice the name.",
    },
    {
      id: "historical-validation",
      title: "Historical Validation",
      description:
        "Backtest and historical signal quality for this recommendation style.",
    },
    {
      id: "recommendation-timeline",
      title: "Recommendation Timeline",
      description:
        "Chronology of prior calls, revisions, and outcome tracking.",
    },
  ] as const;

/** @deprecated Prefer RECOMMENDATION_DRAWER_PLACEHOLDER_SECTIONS + live sections. */
export const RECOMMENDATION_DRAWER_SECTIONS = [
  {
    id: "executive-summary",
    title: "Executive Summary",
    description:
      "Concise investment thesis and decision snapshot from the research engines.",
  },
  {
    id: "investment-committee-verdict",
    title: "Investment Committee Verdict",
    description:
      "Committee-style consensus, agreement, and publication gate outcome.",
  },
  {
    id: "trade-plan",
    title: "Trade Plan",
    description:
      "Entry, stop, targets, holding period, and risk/reward construction.",
  },
  {
    id: "ai-conviction",
    title: "AI Conviction",
    description:
      "Model conviction, opportunity score, and supporting evidence factors.",
  },
  ...RECOMMENDATION_DRAWER_PLACEHOLDER_SECTIONS,
] as const;

function PlaceholderSection({
  section,
  index,
}: {
  section: RecommendationSectionMeta;
  index: number;
}) {
  return (
    <SectionShell
      index={index}
      title={section.title}
      description={section.description}
      badge="Later"
    >
      <div
        className="rounded-lg border border-dashed border-surface-border-subtle/80 bg-surface/30 p-3"
        role="status"
        aria-label={`${section.title} loading placeholder`}
      >
        <Skeleton className="mb-2 h-3 w-1/3" />
        <SkeletonText lines={3} />
      </div>
    </SectionShell>
  );
}

export function RecommendationDrawerSections({
  context,
}: {
  context: RecommendationDetailContext;
}) {
  const decision = useMemo(
    () =>
      buildExecutiveDecisionView({
        action: context.action,
        confidence: context.confidence,
        currentPrice: context.currentPrice,
        tradeHints: context.tradeHints,
        source: context.source,
      }),
    [context]
  );

  return (
    <div className="space-y-3 p-4 md:p-5">
      <ExecutiveSummarySection view={decision.executiveSummary} />
      <CommitteeVerdictSection view={decision.committee} />
      <TradePlanSection view={decision.tradePlan} />
      <AiConvictionSection view={decision.aiConviction} />

      {RECOMMENDATION_DRAWER_PLACEHOLDER_SECTIONS.map((section, index) => (
        <PlaceholderSection
          key={section.id}
          section={section}
          index={index + 5}
        />
      ))}
    </div>
  );
}
