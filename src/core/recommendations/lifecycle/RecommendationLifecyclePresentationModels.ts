/**
 * Presentation models for lifecycle / progress / timeline surfaces.
 * Performance metrics stay on lifecycle views — not recommendation cards.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type {
  LivingRecommendation,
  RecommendationCurrentHealth,
  RecommendationProgressMetrics,
  RecommendationTimelineEvent,
} from "./RecommendationLifecycleModels";

export const RECOMMENDATION_LIFECYCLE_EMPTY = {
  noActiveRecommendations: "No Active Recommendations",
  noTimeline: "No Timeline",
  awaitingEntry: "Awaiting Entry",
  awaitingProgress: "Awaiting Progress",
} as const;

export type RecommendationLifecycleEmptyMessage =
  (typeof RECOMMENDATION_LIFECYCLE_EMPTY)[keyof typeof RECOMMENDATION_LIFECYCLE_EMPTY];

export type RecommendationLifecycleSurface =
  | "recommendation_center"
  | "research"
  | "company"
  | "dashboard"
  | "watchlists"
  | "portfolio"
  | "replay"
  | "history";

export interface RecommendationLifecycleCardPresentation {
  recommendationId: string;
  symbol: string;
  company: string;
  strategy: string;
  expectedHoldingPeriod: string;
  state: LivingRecommendation["state"];
  displayStatus: LivingRecommendation["displayStatus"];
  originalConviction: number;
  currentHealth: number | null;
  currentTrust: number | null;
  currentValidation: number | null;
  currentRisk: number | null;
  progressPercent: number | null;
  holdingDays: number;
  empty: boolean;
  emptyMessage: RecommendationLifecycleEmptyMessage | null;
}

export interface RecommendationTimelinePresentation {
  recommendationId: string;
  events: RecommendationTimelineEvent[];
  empty: boolean;
  emptyMessage: RecommendationLifecycleEmptyMessage;
}

export interface RecommendationProgressPresentation {
  recommendationId: string;
  metrics: RecommendationProgressMetrics;
  empty: boolean;
  emptyMessage: RecommendationLifecycleEmptyMessage | null;
}

export interface RecommendationHealthPresentation {
  recommendationId: string;
  health: RecommendationCurrentHealth;
  /** Explicit separation: original conviction is never overwritten by health. */
  originalConviction: number;
}

export interface RecommendationSurfaceBundle {
  surface: RecommendationLifecycleSurface;
  active: RecommendationLifecycleCardPresentation[];
  history: RecommendationLifecycleCardPresentation[];
  empty: boolean;
  emptyMessage: RecommendationLifecycleEmptyMessage;
}

function toCard(
  living: LivingRecommendation
): RecommendationLifecycleCardPresentation {
  return {
    recommendationId: living.recommendationId,
    symbol: living.snapshot.company.symbol,
    company: living.snapshot.company.name,
    strategy: living.snapshot.strategy,
    expectedHoldingPeriod: living.snapshot.expectedHoldingPeriod,
    state: living.state,
    displayStatus: living.displayStatus,
    originalConviction: living.health.originalConviction,
    currentHealth: living.health.currentHealth,
    currentTrust: living.health.currentTrust,
    currentValidation: living.health.currentValidation,
    currentRisk: living.health.currentRisk,
    progressPercent: living.progress.progressPercent,
    holdingDays: living.progress.holdingDays,
    empty: false,
    emptyMessage: null,
  };
}

export function presentLifecycleCard(
  living: LivingRecommendation | undefined,
  emptyMessage: RecommendationLifecycleEmptyMessage = RECOMMENDATION_LIFECYCLE_EMPTY.noActiveRecommendations
): RecommendationLifecycleCardPresentation {
  if (!living) {
    return {
      recommendationId: "",
      symbol: "",
      company: "",
      strategy: "",
      expectedHoldingPeriod: "",
      state: "GENERATED",
      displayStatus: "Generated",
      originalConviction: 0,
      currentHealth: null,
      currentTrust: null,
      currentValidation: null,
      currentRisk: null,
      progressPercent: null,
      holdingDays: 0,
      empty: true,
      emptyMessage,
    };
  }
  return toCard(living);
}

export function presentLifecycleTimeline(
  recommendationId: string,
  events: readonly RecommendationTimelineEvent[] | undefined
): RecommendationTimelinePresentation {
  if (!events || events.length === 0) {
    return {
      recommendationId,
      events: [],
      empty: true,
      emptyMessage: RECOMMENDATION_LIFECYCLE_EMPTY.noTimeline,
    };
  }
  return {
    recommendationId,
    events: [...events],
    empty: false,
    emptyMessage: RECOMMENDATION_LIFECYCLE_EMPTY.noTimeline,
  };
}

export function presentLifecycleProgress(
  recommendationId: string,
  living: LivingRecommendation | undefined
): RecommendationProgressPresentation {
  if (!living) {
    return {
      recommendationId,
      metrics: {
        entryPercent: null,
        currentReturnPercent: null,
        distanceToEntry: null,
        distanceToStopLoss: null,
        distanceToTarget1: null,
        distanceToTarget2: null,
        rewardAchievedPercent: null,
        holdingDays: 0,
        holdingSessions: 0,
        progressPercent: null,
      },
      empty: true,
      emptyMessage: RECOMMENDATION_LIFECYCLE_EMPTY.awaitingProgress,
    };
  }

  const awaitingEntry =
    living.state === "GENERATED" || living.state === "ENTRY_PENDING";
  return {
    recommendationId,
    metrics: living.progress,
    empty: awaitingEntry && living.progress.entryPercent == null,
    emptyMessage: awaitingEntry
      ? RECOMMENDATION_LIFECYCLE_EMPTY.awaitingEntry
      : null,
  };
}

export function presentLifecycleHealth(
  living: LivingRecommendation
): RecommendationHealthPresentation {
  return {
    recommendationId: living.recommendationId,
    health: living.health,
    originalConviction: living.snapshot.originalConviction,
  };
}

export function presentLifecycleForSurface(
  surface: RecommendationLifecycleSurface,
  active: LivingRecommendation[],
  history: LivingRecommendation[] = []
): RecommendationSurfaceBundle {
  return {
    surface,
    active: active.map(toCard),
    history: history.map(toCard),
    empty: active.length === 0,
    emptyMessage: RECOMMENDATION_LIFECYCLE_EMPTY.noActiveRecommendations,
  };
}

/** Preserve snapshot identity when adapting for surface consumers. */
export function snapshotFromLiving(
  living: LivingRecommendation
): RecommendationSnapshot {
  return living.snapshot;
}
