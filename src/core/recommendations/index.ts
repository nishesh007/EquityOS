/**
 * Recommendation Snapshot Engine & Immutable AI Memory public API.
 * Sprint 9F.1.R2 lifecycle APIs are re-exported below (living state only).
 */

import type { RecommendationStorageStatus } from "./RecommendationMetadata";
import {
  RecommendationRegistry,
  type RecommendationQuery,
} from "./RecommendationRegistry";
import type {
  CreateRecommendationSnapshotInput,
  RecommendationSnapshot,
} from "./RecommendationSnapshot";
import {
  bindRecommendationSnapshotLoader,
  registerRecommendationLifecycle,
  resetRecommendationLifecycle,
  type RecommendationHealthInput,
  type LivingRecommendation,
} from "./lifecycle";

export * from "./RecommendationIdentity";
export * from "./RecommendationMetadata";
export * from "./RecommendationPresentationModels";
export * from "./RecommendationRegistry";
export * from "./RecommendationSnapshot";
export * from "./RecommendationStorage";

export {
  advanceRecommendation,
  updateRecommendationStatus,
  getRecommendationStatus,
  getRecommendationProgress,
  getRecommendationTimeline,
  expireRecommendation,
  archiveRecommendation as archiveRecommendationLifecycle,
  registerRecommendationLifecycle,
  getLivingRecommendation,
  listLivingRecommendations,
  listActiveLivingRecommendations,
  resetRecommendationLifecycle,
  presentLifecycleCard,
  presentLifecycleTimeline,
  presentLifecycleProgress,
  presentLifecycleHealth,
  presentLifecycleForSurface,
  wireRecommendationCenter,
  wireResearchRecommendations,
  wireCompanyRecommendations,
  wireDashboardRecommendations,
  wireWatchlistRecommendations,
  wirePortfolioRecommendations,
  wireRecommendationReplay,
  wireRecommendationHistory,
  RECOMMENDATION_LIFECYCLE_EMPTY,
  RECOMMENDATION_LIFECYCLE_STATES,
  RECOMMENDATION_ALTERNATIVE_STATES,
  RecommendationLifecycleEngine,
} from "./lifecycle";
export type {
  LivingRecommendation,
  RecommendationLivingState,
  RecommendationDisplayStatus,
  RecommendationProgressMetrics,
  RecommendationTimelineEvent,
  RecommendationCurrentHealth,
  RecommendationStatusView,
  RecommendationLifecycleSurface,
  RecommendationSurfaceBundle,
  AdvanceRecommendationInput,
  UpdateRecommendationStatusInput,
} from "./lifecycle";

const recommendationRegistry = new RecommendationRegistry();
bindRecommendationSnapshotLoader((id) => recommendationRegistry.load(id));

export function createRecommendation(
  input: CreateRecommendationSnapshotInput,
  status: RecommendationStorageStatus = "ACTIVE"
): RecommendationSnapshot {
  return recommendationRegistry.create(input, status);
}

export function loadRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined {
  return recommendationRegistry.load(recommendationId);
}

/**
 * Create an immutable R1 snapshot and register it for R2 lifecycle tracking.
 */
export function createLivingRecommendation(
  input: CreateRecommendationSnapshotInput,
  options?: {
    health?: RecommendationHealthInput;
    note?: string;
  }
): LivingRecommendation {
  const snapshot = createRecommendation(input);
  return registerRecommendationLifecycle(snapshot, {
    occurredAt: snapshot.generatedAt,
    health: options?.health,
    note: options?.note,
  });
}

export function findRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined;
export function findRecommendation(
  query: RecommendationQuery
): RecommendationSnapshot | undefined;
export function findRecommendation(
  identityOrQuery: string | RecommendationQuery
): RecommendationSnapshot | undefined {
  return typeof identityOrQuery === "string"
    ? recommendationRegistry.find(identityOrQuery)
    : recommendationRegistry.find(identityOrQuery);
}

export function findCompanyRecommendations(
  company: string
): RecommendationSnapshot[] {
  return recommendationRegistry.findByCompany(company);
}

export function listRecommendations(
  query: RecommendationQuery = {}
): RecommendationSnapshot[] {
  return recommendationRegistry.list(query);
}

export function archiveRecommendation(
  recommendationId: string
): RecommendationSnapshot | undefined {
  return recommendationRegistry.archive(recommendationId);
}

export function getLatestRecommendation(
  query: Omit<RecommendationQuery, "status"> = {}
): RecommendationSnapshot | undefined {
  return recommendationRegistry.latest(query);
}

export function recommendationExists(recommendationId: string): boolean {
  return recommendationRegistry.exists(recommendationId);
}

/** Clears the process-local registry, primarily for isolated application/test scopes. */
export function resetRecommendationRegistry(): void {
  recommendationRegistry.clear();
  resetRecommendationLifecycle();
}
