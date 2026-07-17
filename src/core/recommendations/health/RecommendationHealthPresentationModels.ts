/**
 * Presentation models for recommendation health / conviction drift surfaces.
 */

import type {
  RecommendationHealthAssessment,
  RecommendationHealthExplanation,
  RecommendationHealthFactor,
  RecommendationHealthState,
  RecommendationHealthTrend,
} from "./RecommendationHealthModels";

export const RECOMMENDATION_HEALTH_EMPTY = {
  healthPending: "Health Pending",
  awaitingUpdate: "Awaiting Update",
  noHealthFactors: "No Health Factors",
} as const;

export type RecommendationHealthEmptyMessage =
  (typeof RECOMMENDATION_HEALTH_EMPTY)[keyof typeof RECOMMENDATION_HEALTH_EMPTY];

export type RecommendationHealthSurface =
  | "dashboard"
  | "company"
  | "research"
  | "recommendation_center"
  | "portfolio"
  | "watchlists"
  | "replay";

export interface RecommendationHealthCardPresentation {
  recommendationId: string;
  symbol: string;
  company: string;
  originalConviction: number;
  currentHealth: number | null;
  trend: RecommendationHealthTrend | null;
  healthState: RecommendationHealthState | null;
  statusBadge: string;
  healthBadge: string;
  empty: boolean;
  emptyMessage: RecommendationHealthEmptyMessage | null;
}

export interface RecommendationHealthDetailPresentation {
  card: RecommendationHealthCardPresentation;
  factors: RecommendationHealthFactor[];
  explanation: RecommendationHealthExplanation | null;
  drift: number | null;
  empty: boolean;
  emptyMessage: RecommendationHealthEmptyMessage | null;
}

export interface RecommendationHealthSurfaceBundle {
  surface: RecommendationHealthSurface;
  cards: RecommendationHealthCardPresentation[];
  empty: boolean;
  emptyMessage: RecommendationHealthEmptyMessage;
}

function statusBadge(assessment: RecommendationHealthAssessment): string {
  return assessment.trend;
}

function healthBadge(assessment: RecommendationHealthAssessment): string {
  return assessment.state;
}

export function presentRecommendationHealthCard(
  assessment: RecommendationHealthAssessment | undefined
): RecommendationHealthCardPresentation {
  if (!assessment) {
    return {
      recommendationId: "",
      symbol: "",
      company: "",
      originalConviction: 0,
      currentHealth: null,
      trend: null,
      healthState: null,
      statusBadge: RECOMMENDATION_HEALTH_EMPTY.healthPending,
      healthBadge: RECOMMENDATION_HEALTH_EMPTY.awaitingUpdate,
      empty: true,
      emptyMessage: RECOMMENDATION_HEALTH_EMPTY.healthPending,
    };
  }

  return {
    recommendationId: assessment.recommendationId,
    symbol: assessment.snapshot.company.symbol,
    company: assessment.snapshot.company.name,
    originalConviction: assessment.original.originalConviction,
    currentHealth: assessment.current.currentHealth,
    trend: assessment.trend,
    healthState: assessment.state,
    statusBadge: statusBadge(assessment),
    healthBadge: healthBadge(assessment),
    empty: false,
    emptyMessage: null,
  };
}

export function presentRecommendationHealthDetail(
  assessment: RecommendationHealthAssessment | undefined
): RecommendationHealthDetailPresentation {
  if (!assessment) {
    return {
      card: presentRecommendationHealthCard(undefined),
      factors: [],
      explanation: null,
      drift: null,
      empty: true,
      emptyMessage: RECOMMENDATION_HEALTH_EMPTY.awaitingUpdate,
    };
  }

  const scoredFactors = assessment.factors.filter(
    (factor) => factor.currentScore != null
  );
  return {
    card: presentRecommendationHealthCard(assessment),
    factors: [...assessment.factors],
    explanation: assessment.explanation,
    drift: assessment.drift.drift,
    empty: scoredFactors.length === 0,
    emptyMessage:
      scoredFactors.length === 0
        ? RECOMMENDATION_HEALTH_EMPTY.noHealthFactors
        : null,
  };
}

export function presentRecommendationHealthForSurface(
  surface: RecommendationHealthSurface,
  assessments: RecommendationHealthAssessment[]
): RecommendationHealthSurfaceBundle {
  const cards = assessments.map((assessment) =>
    presentRecommendationHealthCard(assessment)
  );
  return {
    surface,
    cards,
    empty: cards.length === 0,
    emptyMessage: RECOMMENDATION_HEALTH_EMPTY.healthPending,
  };
}
