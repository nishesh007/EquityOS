"use client";

import { buildExecutiveDecisionView } from "@/lib/recommendations/executive-decision-presenter";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { AiConvictionSection } from "./AiConvictionSection";
import { CommitteeVerdictSection } from "./CommitteeVerdictSection";
import { DrawerBodySkeleton, DrawerEmptyState } from "./DrawerStates";
import { ExecutiveSummarySection } from "./ExecutiveSummarySection";
import { TradePlanSection } from "./TradePlanSection";
import type { RecommendationDetailContext } from "./types";

const DeferredResearchAndTrust = dynamic(
  () =>
    import("./DeferredResearchAndTrust").then(
      (mod) => mod.DeferredResearchAndTrust
    ),
  {
    ssr: false,
    loading: () => <DrawerBodySkeleton />,
  }
);

export interface RecommendationSectionMeta {
  id: string;
  title: string;
  description: string;
}

/** Full drawer section catalog (Sprint 11A.1–11A.4). */
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
    title: "Events & Catalysts",
    description:
      "Near-term and structural catalysts that could reprice the name.",
  },
  {
    id: "financial-quality",
    title: "Financial Quality Snapshot",
    description: "Compact financial quality score cards.",
  },
  {
    id: "related-research",
    title: "Related Research",
    description: "Navigation into existing EquityOS research surfaces.",
  },
  {
    id: "similar-historical-setups",
    title: "Similar Historical Setups",
    description: "Comparable historical recommendation outcomes.",
  },
  {
    id: "recommendation-performance",
    title: "Recommendation Performance",
    description: "Win rate and outcome statistics.",
  },
  {
    id: "confidence-evolution",
    title: "Confidence Evolution",
    description: "How confidence changed versus prior packages.",
  },
  {
    id: "recommendation-timeline",
    title: "Recommendation Timeline",
    description: "Audit chronology of generation and validation.",
  },
  {
    id: "audit-trail",
    title: "Audit Trail",
    description: "Publication-gate verification checklist.",
  },
  {
    id: "data-quality",
    title: "Data Quality & Source Confidence",
    description: "Freshness and confidence of research inputs.",
  },
  {
    id: "investment-suitability",
    title: "Disclaimer & Investment Suitability",
    description: "Horizon, risk category, and professional disclaimer.",
  },
] as const;

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
    [
      context.action,
      context.confidence,
      context.currentPrice,
      context.tradeHints,
      context.source,
    ]
  );

  const unavailable = Boolean(context.statusMessage) && !context.source;

  return (
    <div className="space-y-3 p-4 md:p-5">
      {unavailable ? (
        <DrawerEmptyState
          title="No recommendation"
          message="There is no active published recommendation for this company right now."
        />
      ) : null}

      <ExecutiveSummarySection view={decision.executiveSummary} />
      <CommitteeVerdictSection view={decision.committee} />
      <TradePlanSection view={decision.tradePlan} />
      <AiConvictionSection view={decision.aiConviction} />

      <DeferredResearchAndTrust context={context} />
    </div>
  );
}
