/**
 * Presentation models for recommendation outcomes / institutional performance.
 */

import type {
  InstitutionalVerdict,
  RecommendationOutcomeAssessment,
  RecommendationOutcomeSummary,
} from "./RecommendationOutcomeModels";

export const RECOMMENDATION_OUTCOME_EMPTY = {
  noCompletedRecommendations: "No Completed Recommendations",
  noRunningRecommendations: "No Running Recommendations",
  awaitingOutcome: "Awaiting Outcome",
  awaitingEntry: "Awaiting Entry",
} as const;

export type RecommendationOutcomeEmptyMessage =
  (typeof RECOMMENDATION_OUTCOME_EMPTY)[keyof typeof RECOMMENDATION_OUTCOME_EMPTY];

export type RecommendationOutcomeSurface =
  | "dashboard"
  | "company"
  | "research"
  | "recommendation_center"
  | "portfolio"
  | "replay"
  | "history"
  | "watchlists";

/** Trade Outcomes panel row — replaces fake A/B/C/D grades. */
export interface RecommendationOutcomePanelRow {
  recommendationId: string;
  symbol: string;
  company: string;
  recommendationDate: string;
  strategy: string;
  expectedHoldingPeriod: string;
  currentStatus: string;
  currentReturn: string;
  maximumGain: string;
  maximumDrawdown: string;
  targetProgress: string;
  targetAchieved: string;
  exitReason: string;
  finalGrade: InstitutionalVerdict;
  lifecycleBadge: string;
  originalConviction: number;
  currentHealth: number | null;
  empty: boolean;
  emptyMessage: RecommendationOutcomeEmptyMessage | null;
}

export interface HighestConvictionOutcomeCard {
  recommendationId: string;
  symbol: string;
  company: string;
  originalConviction: number;
  currentHealth: number | null;
  expectedHoldingPeriod: string;
  strategy: string;
  lifecycleStatus: string;
  currentProgress: string;
  currentReturn: string;
  targetProgress: string;
  empty: boolean;
  emptyMessage: RecommendationOutcomeEmptyMessage | null;
}

export interface RecommendationOutcomeSurfaceBundle {
  surface: RecommendationOutcomeSurface;
  rows: RecommendationOutcomePanelRow[];
  cards: HighestConvictionOutcomeCard[];
  summary: RecommendationOutcomeSummary | null;
  empty: boolean;
  emptyMessage: RecommendationOutcomeEmptyMessage;
}

function fmtPct(value: number | null | undefined, signed = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toFixed(2);
  if (!signed) return `${value.toFixed(2)}%`;
  return value > 0 ? `+${abs}%` : value < 0 ? `-${abs}%` : "0.00%";
}

export function presentOutcomePanelRow(
  assessment: RecommendationOutcomeAssessment | undefined
): RecommendationOutcomePanelRow {
  if (!assessment) {
    return {
      recommendationId: "",
      symbol: "",
      company: "",
      recommendationDate: "",
      strategy: "",
      expectedHoldingPeriod: "",
      currentStatus: RECOMMENDATION_OUTCOME_EMPTY.awaitingOutcome,
      currentReturn: "—",
      maximumGain: "—",
      maximumDrawdown: "—",
      targetProgress: "—",
      targetAchieved: "—",
      exitReason: "—",
      finalGrade: "Neutral",
      lifecycleBadge: RECOMMENDATION_OUTCOME_EMPTY.awaitingOutcome,
      originalConviction: 0,
      currentHealth: null,
      empty: true,
      emptyMessage: RECOMMENDATION_OUTCOME_EMPTY.awaitingOutcome,
    };
  }

  return {
    recommendationId: assessment.recommendationId,
    symbol: assessment.snapshot.company.symbol,
    company: assessment.snapshot.company.name,
    recommendationDate: assessment.recommendationDate,
    strategy: assessment.strategy,
    expectedHoldingPeriod: assessment.expectedHoldingPeriod,
    currentStatus: assessment.state,
    currentReturn: fmtPct(assessment.performance.currentReturnPercent, true),
    maximumGain: fmtPct(assessment.performance.maximumGainPercent, true),
    maximumDrawdown: fmtPct(assessment.performance.maximumDrawdownPercent, true),
    targetProgress: `${assessment.performance.targetProgressPercent}%`,
    targetAchieved: assessment.targetAchieved ?? "—",
    exitReason: assessment.exitReason ?? "—",
    finalGrade: assessment.verdict,
    lifecycleBadge: assessment.lifecycleBadge,
    originalConviction: assessment.originalConviction,
    currentHealth: assessment.currentHealth,
    empty: false,
    emptyMessage: null,
  };
}

export function presentHighestConvictionOutcomeCard(
  assessment: RecommendationOutcomeAssessment | undefined
): HighestConvictionOutcomeCard {
  if (!assessment) {
    return {
      recommendationId: "",
      symbol: "",
      company: "",
      originalConviction: 0,
      currentHealth: null,
      expectedHoldingPeriod: "",
      strategy: "",
      lifecycleStatus: RECOMMENDATION_OUTCOME_EMPTY.awaitingEntry,
      currentProgress: "—",
      currentReturn: "—",
      targetProgress: "—",
      empty: true,
      emptyMessage: RECOMMENDATION_OUTCOME_EMPTY.awaitingEntry,
    };
  }

  return {
    recommendationId: assessment.recommendationId,
    symbol: assessment.snapshot.company.symbol,
    company: assessment.snapshot.company.name,
    originalConviction: assessment.originalConviction,
    currentHealth: assessment.currentHealth,
    expectedHoldingPeriod: assessment.expectedHoldingPeriod,
    strategy: assessment.strategy,
    lifecycleStatus: assessment.state,
    currentProgress: `${assessment.performance.targetProgressPercent}%`,
    currentReturn: fmtPct(assessment.performance.currentReturnPercent, true),
    targetProgress: `${assessment.targets.targetProgressPercent}%`,
    empty: false,
    emptyMessage: null,
  };
}

export function presentRecommendationOutcomesForSurface(
  surface: RecommendationOutcomeSurface,
  assessments: RecommendationOutcomeAssessment[],
  summary: RecommendationOutcomeSummary | null = null
): RecommendationOutcomeSurfaceBundle {
  const rows = assessments.map((item) => presentOutcomePanelRow(item));
  const cards = assessments.map((item) =>
    presentHighestConvictionOutcomeCard(item)
  );
  const running = assessments.some((item) =>
    ["Pending Entry", "Entry Triggered", "Running", "Trailing"].includes(item.state)
  );
  return {
    surface,
    rows,
    cards,
    summary,
    empty: assessments.length === 0,
    emptyMessage: running
      ? RECOMMENDATION_OUTCOME_EMPTY.noCompletedRecommendations
      : assessments.length === 0
        ? RECOMMENDATION_OUTCOME_EMPTY.awaitingOutcome
        : RECOMMENDATION_OUTCOME_EMPTY.noRunningRecommendations,
  };
}

/**
 * Transitional adapter for legacy session TradeOutcome rows.
 * Replaces A/B/C/D letter grades with institutional verdicts.
 * Prefer RecommendationOutcomeAssessment when available.
 */
export function institutionalVerdictFromSessionStatus(
  status: "target2_hit" | "target1_hit" | "stopped" | "open" | "breakeven"
): InstitutionalVerdict {
  switch (status) {
    case "target2_hit":
      return "Outstanding";
    case "target1_hit":
      return "Successful";
    case "stopped":
      return "Failed";
    case "breakeven":
      return "Neutral";
    case "open":
    default:
      return "Neutral";
  }
}
