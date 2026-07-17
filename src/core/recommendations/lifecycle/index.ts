/**
 * Sprint 9F.1.R2 – Recommendation Lifecycle Engine public API.
 *
 * Living recommendations evolve through lifecycle states.
 * Immutable R1 snapshots are never mutated.
 *
 * Note: This module does not import the parent recommendations barrel
 * (avoids circular deps). Pass snapshots via registerRecommendationLifecycle
 * or use createLivingRecommendation from @/src/core/recommendations.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import { RecommendationLifecycleEngine } from "./RecommendationLifecycleEngine";
import type {
  AdvanceRecommendationInput,
  LivingRecommendation,
  RecommendationHealthInput,
  RecommendationProgressMetrics,
  RecommendationStatusView,
  RecommendationTimelineEvent,
  UpdateRecommendationStatusInput,
} from "./RecommendationLifecycleModels";
import {
  presentLifecycleCard,
  presentLifecycleForSurface,
  presentLifecycleHealth,
  presentLifecycleProgress,
  presentLifecycleTimeline,
  type RecommendationLifecycleSurface,
  type RecommendationSurfaceBundle,
} from "./RecommendationLifecyclePresentationModels";

export * from "./RecommendationLifecycleModels";
export * from "./RecommendationLifecycleEngine";
export * from "./RecommendationStatusEngine";
export * from "./RecommendationProgressEngine";
export * from "./RecommendationTimelineEngine";
export * from "./RecommendationLifecyclePresentationModels";

const lifecycleEngine = new RecommendationLifecycleEngine();

/** Optional snapshot loader bound by the parent recommendations barrel. */
let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;

export function bindRecommendationSnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined
): void {
  snapshotLoader = loader;
}

function ensureRegistered(recommendationId: string): LivingRecommendation {
  const existing = lifecycleEngine.get(recommendationId);
  if (existing) return existing;
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) {
    throw new Error(
      `Lifecycle not registered for ${recommendationId}. Call registerRecommendationLifecycle first.`
    );
  }
  return lifecycleEngine.register(snapshot);
}

/** Register an existing immutable snapshot into the lifecycle engine. */
export function registerRecommendationLifecycle(
  snapshot: RecommendationSnapshot,
  options?: {
    occurredAt?: string | Date;
    note?: string;
    health?: RecommendationHealthInput;
  }
): LivingRecommendation {
  const existing = lifecycleEngine.get(snapshot.recommendationId);
  if (existing) return existing;
  return lifecycleEngine.register(snapshot, options);
}

export function advanceRecommendation(
  input: AdvanceRecommendationInput
): LivingRecommendation {
  ensureRegistered(input.recommendationId);
  return lifecycleEngine.advance(input);
}

export function updateRecommendationStatus(
  input: UpdateRecommendationStatusInput
): LivingRecommendation {
  ensureRegistered(input.recommendationId);
  return lifecycleEngine.updateStatus(input);
}

export function getRecommendationStatus(
  recommendationId: string
): RecommendationStatusView | undefined {
  if (!lifecycleEngine.get(recommendationId)) {
    const snapshot = snapshotLoader?.(recommendationId);
    if (!snapshot) return undefined;
    lifecycleEngine.register(snapshot);
  }
  return lifecycleEngine.getStatus(recommendationId);
}

export function getRecommendationProgress(
  recommendationId: string
): RecommendationProgressMetrics | undefined {
  if (!lifecycleEngine.get(recommendationId)) {
    const snapshot = snapshotLoader?.(recommendationId);
    if (!snapshot) return undefined;
    lifecycleEngine.register(snapshot);
  }
  return lifecycleEngine.getProgress(recommendationId);
}

export function getRecommendationTimeline(
  recommendationId: string
): readonly RecommendationTimelineEvent[] | undefined {
  if (!lifecycleEngine.get(recommendationId)) {
    const snapshot = snapshotLoader?.(recommendationId);
    if (!snapshot) return undefined;
    lifecycleEngine.register(snapshot);
  }
  return lifecycleEngine.getTimeline(recommendationId);
}

export function expireRecommendation(
  recommendationId: string,
  note?: string,
  occurredAt?: string | Date
): LivingRecommendation {
  ensureRegistered(recommendationId);
  return lifecycleEngine.expire(recommendationId, note, occurredAt);
}

/**
 * Lifecycle archive (Active → Expired → Archived).
 * Does not mutate the immutable R1 snapshot.
 */
export function archiveRecommendation(
  recommendationId: string,
  note?: string,
  occurredAt?: string | Date
): LivingRecommendation {
  ensureRegistered(recommendationId);
  return lifecycleEngine.archive(recommendationId, note, occurredAt);
}

export function getLivingRecommendation(
  recommendationId: string
): LivingRecommendation | undefined {
  return lifecycleEngine.get(recommendationId);
}

export function listLivingRecommendations(): LivingRecommendation[] {
  return lifecycleEngine.list();
}

export function listActiveLivingRecommendations(): LivingRecommendation[] {
  return lifecycleEngine.listActive();
}

/** Clears process-local lifecycle memory (tests / isolated scopes). */
export function resetRecommendationLifecycle(): void {
  lifecycleEngine.clear();
}

export function getRecommendationLifecycleEngine(): RecommendationLifecycleEngine {
  return lifecycleEngine;
}

function closedLivingRecommendations(): LivingRecommendation[] {
  const activeIds = new Set(
    lifecycleEngine.listActive().map((item) => item.recommendationId)
  );
  return lifecycleEngine
    .list()
    .filter((item) => !activeIds.has(item.recommendationId));
}

export function wireRecommendationCenter(): RecommendationSurfaceBundle {
  return presentLifecycleForSurface(
    "recommendation_center",
    listActiveLivingRecommendations(),
    closedLivingRecommendations()
  );
}

export function wireResearchRecommendations(): RecommendationSurfaceBundle {
  return presentLifecycleForSurface(
    "research",
    listActiveLivingRecommendations(),
    closedLivingRecommendations()
  );
}

export function wireCompanyRecommendations(
  symbol: string
): RecommendationSurfaceBundle {
  const normalized = symbol.trim().toUpperCase();
  const match = (item: LivingRecommendation) =>
    item.snapshot.company.symbol.toUpperCase() === normalized;
  return presentLifecycleForSurface(
    "company",
    listActiveLivingRecommendations().filter(match),
    closedLivingRecommendations().filter(match)
  );
}

export function wireDashboardRecommendations(): RecommendationSurfaceBundle {
  return presentLifecycleForSurface(
    "dashboard",
    listActiveLivingRecommendations(),
    closedLivingRecommendations()
  );
}

export function wireWatchlistRecommendations(
  symbols: string[]
): RecommendationSurfaceBundle {
  const set = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  const match = (item: LivingRecommendation) =>
    set.has(item.snapshot.company.symbol.toUpperCase());
  return presentLifecycleForSurface(
    "watchlists",
    listActiveLivingRecommendations().filter(match),
    closedLivingRecommendations().filter(match)
  );
}

export function wirePortfolioRecommendations(
  symbols: string[]
): RecommendationSurfaceBundle {
  const set = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  const match = (item: LivingRecommendation) =>
    set.has(item.snapshot.company.symbol.toUpperCase());
  return presentLifecycleForSurface(
    "portfolio",
    listActiveLivingRecommendations().filter(match),
    closedLivingRecommendations().filter(match)
  );
}

export function wireRecommendationReplay(recommendationId: string) {
  const living = getLivingRecommendation(recommendationId);
  return {
    surface: "replay" as RecommendationLifecycleSurface,
    recommendation: living
      ? presentLifecycleCard(living)
      : presentLifecycleCard(undefined),
    timeline: presentLifecycleTimeline(
      recommendationId,
      getRecommendationTimeline(recommendationId)
    ),
    progress: presentLifecycleProgress(recommendationId, living),
    health: living ? presentLifecycleHealth(living) : null,
    status: getRecommendationStatus(recommendationId) ?? null,
    progressMetrics: getRecommendationProgress(recommendationId) ?? null,
  };
}

export function wireRecommendationHistory(): RecommendationSurfaceBundle {
  return presentLifecycleForSurface(
    "history",
    listActiveLivingRecommendations(),
    closedLivingRecommendations()
  );
}
