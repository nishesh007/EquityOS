/**
 * Presentation models for the Institutional Recommendation Center.
 */

import type {
  RecommendationAILessons,
  RecommendationLearningSummary,
} from "../learning";
import type {
  RecommendationComparisonView,
  RecommendationWorkspace,
  RecommendationWorkspaceAnalytics,
  RecommendationWorkspaceRecord,
} from "./RecommendationWorkspaceModels";

export const RECOMMENDATION_WORKSPACE_EMPTY = {
  noRecommendations: "No Recommendations",
  noSearchResults: "No Search Results",
  noComparisonSelected: "No Comparison Selected",
  noAnalyticsAvailable: "No Analytics Available",
} as const;

export type RecommendationWorkspaceEmptyMessage =
  (typeof RECOMMENDATION_WORKSPACE_EMPTY)[keyof typeof RECOMMENDATION_WORKSPACE_EMPTY];

export type RecommendationWorkspaceSurface =
  | "dashboard"
  | "company"
  | "research"
  | "recommendation_center"
  | "replay"
  | "history"
  | "portfolio"
  | "watchlists";

export interface WorkspaceCardPresentation {
  readonly recommendationId: string;
  readonly symbol: string;
  readonly company: string;
  readonly strategy: string;
  readonly holdingPeriod: string;
  readonly lifecycleStatus: string;
  readonly originalConviction: number;
  readonly currentHealth: string;
  readonly verdict: string;
  readonly empty: boolean;
  readonly emptyMessage: RecommendationWorkspaceEmptyMessage | null;
}

export interface WorkspaceAnalyticsPresentation {
  readonly recommendationCount: number;
  readonly activeCount: number;
  readonly completedCount: number;
  readonly successRate: string;
  readonly failureRate: string;
  readonly averageReturn: string;
  readonly averageHoldingPeriod: string;
  readonly bestStrategy: string;
  readonly worstStrategy: string;
  readonly bestSector: string;
  readonly worstSector: string;
  readonly bestMarketRegime: string;
  readonly distribution: readonly string[];
  readonly empty: boolean;
  readonly emptyMessage: RecommendationWorkspaceEmptyMessage | null;
}

export interface WorkspaceSurfaceBundle {
  readonly surface: RecommendationWorkspaceSurface;
  readonly cards: readonly WorkspaceCardPresentation[];
  readonly analytics: WorkspaceAnalyticsPresentation;
  readonly learningSummary: RecommendationLearningSummary;
  readonly aiLessons: RecommendationAILessons;
  readonly comparison: RecommendationComparisonView;
  readonly empty: boolean;
  readonly emptyMessage: RecommendationWorkspaceEmptyMessage | null;
}

function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}`;
}

export function presentWorkspaceCard(
  record: RecommendationWorkspaceRecord | undefined
): WorkspaceCardPresentation {
  if (!record) {
    return Object.freeze({
      recommendationId: "",
      symbol: "",
      company: "",
      strategy: "",
      holdingPeriod: "",
      lifecycleStatus: "",
      originalConviction: 0,
      currentHealth: "—",
      verdict: "—",
      empty: true,
      emptyMessage: RECOMMENDATION_WORKSPACE_EMPTY.noRecommendations,
    });
  }
  return Object.freeze({
    recommendationId: record.recommendationId,
    symbol: record.ticker,
    company: record.companyName,
    strategy: record.strategy,
    holdingPeriod: record.holdingPeriod,
    lifecycleStatus: record.lifecycleStatus,
    originalConviction: record.originalConviction,
    currentHealth: fmt(record.currentHealth),
    verdict: record.institutionalVerdict ?? "Pending",
    empty: false,
    emptyMessage: null,
  });
}

export function presentWorkspaceAnalytics(
  analytics: RecommendationWorkspaceAnalytics
): WorkspaceAnalyticsPresentation {
  const empty = analytics.recommendationCount === 0;
  return Object.freeze({
    recommendationCount: analytics.recommendationCount,
    activeCount: analytics.activeCount,
    completedCount: analytics.completedCount,
    successRate: `${analytics.successRate.toFixed(1)}%`,
    failureRate: `${analytics.failureRate.toFixed(1)}%`,
    averageReturn:
      analytics.averageReturn == null
        ? "—"
        : `${analytics.averageReturn.toFixed(1)}%`,
    averageHoldingPeriod: analytics.averageHoldingPeriod ?? "—",
    bestStrategy: analytics.bestStrategy ?? "—",
    worstStrategy: analytics.worstStrategy ?? "—",
    bestSector: analytics.bestSector ?? "—",
    worstSector: analytics.worstSector ?? "—",
    bestMarketRegime: analytics.bestMarketRegime ?? "—",
    distribution: Object.freeze(
      analytics.recommendationDistribution.map(
        (bucket) => `${bucket.key}: ${bucket.count} (${bucket.percent}%)`
      )
    ),
    empty,
    emptyMessage: empty
      ? RECOMMENDATION_WORKSPACE_EMPTY.noAnalyticsAvailable
      : null,
  });
}

export function presentWorkspaceSearchResults(
  records: readonly RecommendationWorkspaceRecord[]
): {
  readonly cards: readonly WorkspaceCardPresentation[];
  readonly empty: boolean;
  readonly emptyMessage: RecommendationWorkspaceEmptyMessage | null;
} {
  if (records.length === 0) {
    return Object.freeze({
      cards: Object.freeze([]),
      empty: true,
      emptyMessage: RECOMMENDATION_WORKSPACE_EMPTY.noSearchResults,
    });
  }
  return Object.freeze({
    cards: Object.freeze(records.map((record) => presentWorkspaceCard(record))),
    empty: false,
    emptyMessage: null,
  });
}

export function presentComparison(
  comparison: RecommendationComparisonView
): RecommendationComparisonView & {
  emptyMessage: RecommendationWorkspaceEmptyMessage | null;
} {
  return Object.freeze({
    ...comparison,
    emptyMessage: comparison.empty
      ? RECOMMENDATION_WORKSPACE_EMPTY.noComparisonSelected
      : null,
  });
}

export function presentRecommendationWorkspaceForSurface(
  surface: RecommendationWorkspaceSurface,
  workspace: RecommendationWorkspace,
  comparison?: RecommendationComparisonView
): WorkspaceSurfaceBundle {
  const empty = workspace.records.length === 0;
  return Object.freeze({
    surface,
    cards: Object.freeze(
      workspace.records.map((record) => presentWorkspaceCard(record))
    ),
    analytics: presentWorkspaceAnalytics(workspace.analytics),
    learningSummary: workspace.learningSummary,
    aiLessons: workspace.aiLessons,
    comparison: comparison ?? {
      recommendationIds: [],
      rows: [],
      empty: true,
    },
    empty,
    emptyMessage: empty
      ? RECOMMENDATION_WORKSPACE_EMPTY.noRecommendations
      : null,
  });
}
