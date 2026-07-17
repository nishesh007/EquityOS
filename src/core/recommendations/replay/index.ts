/**
 * Sprint 9F.1.R4 – Recommendation Replay Engine public API.
 *
 * Composes immutable R1 snapshots with R2 lifecycle and R3 health reads.
 * Historical recommendations are never rewritten.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  getLivingRecommendation,
  getRecommendationTimeline,
} from "../lifecycle";
import {
  getHealthExplanation,
  getRecommendationHealth,
} from "../health";
import {
  buildRecommendationAudit,
  buildAiLessons,
  buildComparisonView,
} from "./RecommendationAuditEngine";
import { buildDecisionJournal } from "./RecommendationDecisionJournal";
import {
  RecommendationReplayEngine,
  buildRecommendationReplay,
} from "./RecommendationReplayEngine";
import type {
  CurrentMarketReplayInput,
  RecommendationAuditRecord,
  RecommendationComparisonView,
  RecommendationDecisionJournal,
  RecommendationReplayBundle,
} from "./RecommendationReplayModels";
import {
  presentDecisionJournal,
  presentRecommendationAudit,
  presentRecommendationReplayCard,
  presentRecommendationReplayDetail,
  presentRecommendationReplayForSurface,
  type RecommendationReplaySurface,
  type RecommendationReplaySurfaceBundle,
} from "./RecommendationReplayPresentationModels";

export * from "./RecommendationReplayModels";
export * from "./RecommendationDecisionJournal";
export * from "./RecommendationAuditEngine";
export * from "./RecommendationReplayEngine";
export * from "./RecommendationReplayPresentationModels";

const replayEngine = new RecommendationReplayEngine();

let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;

export function bindRecommendationReplaySnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined
): void {
  snapshotLoader = loader;
}

function requireSnapshot(recommendationId: string): RecommendationSnapshot {
  const cached = replayEngine.get(recommendationId)?.snapshot;
  if (cached) return cached;
  const loaded = snapshotLoader?.(recommendationId);
  if (!loaded) {
    throw new Error(`Recommendation ${recommendationId} not found for replay`);
  }
  return loaded;
}

function composeReplay(
  recommendationId: string,
  market?: CurrentMarketReplayInput
): RecommendationReplayBundle {
  const snapshot = requireSnapshot(recommendationId);
  const lifecycle = getLivingRecommendation(recommendationId) ?? null;
  const health = getRecommendationHealth(recommendationId) ?? null;
  return replayEngine.replay({
    snapshot,
    lifecycle,
    health,
    market,
  });
}

export function getRecommendationReplay(
  recommendationId: string,
  market?: CurrentMarketReplayInput
): RecommendationReplayBundle | undefined {
  const existing = replayEngine.get(recommendationId);
  if (existing && !market) return existing;
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot && !existing) return undefined;
  return composeReplay(recommendationId, market);
}

export function getDecisionJournal(
  recommendationId: string
): RecommendationDecisionJournal | undefined {
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) {
    return replayEngine.get(recommendationId)?.journal;
  }
  return buildDecisionJournal(snapshot);
}

export function getRecommendationAudit(
  recommendationId: string,
  market?: CurrentMarketReplayInput
): RecommendationAuditRecord | undefined {
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return replayEngine.get(recommendationId)?.audit;
  const lifecycle = getLivingRecommendation(recommendationId) ?? null;
  const health = getRecommendationHealth(recommendationId) ?? null;
  const timeline =
    getRecommendationTimeline(recommendationId) ?? lifecycle?.timeline ?? [];
  return buildRecommendationAudit(
    snapshot,
    lifecycle,
    health,
    timeline,
    market
  );
}

export function compareRecommendation(
  recommendationId: string,
  market?: CurrentMarketReplayInput
): RecommendationComparisonView | undefined {
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return replayEngine.get(recommendationId)?.comparison;
  const health = getRecommendationHealth(recommendationId) ?? null;
  return buildComparisonView(snapshot, health, market);
}

export function getRecommendationLessons(
  recommendationId: string
): readonly string[] | undefined {
  const replay = getRecommendationReplay(recommendationId);
  if (replay) return replay.lessons;

  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return undefined;
  const lifecycle = getLivingRecommendation(recommendationId) ?? null;
  const health = getRecommendationHealth(recommendationId) ?? null;
  const timeline =
    getRecommendationTimeline(recommendationId) ?? lifecycle?.timeline ?? [];
  const audit = buildRecommendationAudit(snapshot, lifecycle, health, timeline);
  return buildAiLessons(snapshot, health, timeline, audit.outcome);
}

export function listRecommendationReplays(): RecommendationReplayBundle[] {
  return replayEngine.list();
}

export function resetRecommendationReplay(): void {
  replayEngine.clear();
}

export function getRecommendationReplayEngine(): RecommendationReplayEngine {
  return replayEngine;
}

/** Direct composition helper for tests and callers with an explicit snapshot. */
export function replayRecommendationSnapshot(
  snapshot: RecommendationSnapshot,
  options?: {
    market?: CurrentMarketReplayInput;
    replayedAt?: string | Date;
  }
): RecommendationReplayBundle {
  const lifecycle = getLivingRecommendation(snapshot.recommendationId) ?? null;
  const health = getRecommendationHealth(snapshot.recommendationId) ?? null;
  return replayEngine.replay({
    snapshot,
    lifecycle,
    health,
    market: options?.market,
    replayedAt: options?.replayedAt,
  });
}

function filterBySymbol(
  replays: RecommendationReplayBundle[],
  symbol?: string
): RecommendationReplayBundle[] {
  if (!symbol) return replays;
  const normalized = symbol.trim().toUpperCase();
  return replays.filter(
    (item) => item.snapshot.company.symbol.toUpperCase() === normalized
  );
}

function filterBySymbols(
  replays: RecommendationReplayBundle[],
  symbols: string[]
): RecommendationReplayBundle[] {
  const set = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  return replays.filter((item) =>
    set.has(item.snapshot.company.symbol.toUpperCase())
  );
}

export function wireReplayDashboard(): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface("dashboard", replayEngine.list());
}

export function wireReplayResearch(): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface("research", replayEngine.list());
}

export function wireReplayCompany(symbol: string): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface(
    "company",
    filterBySymbol(replayEngine.list(), symbol)
  );
}

export function wireReplayRecommendationCenter(): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface(
    "recommendation_center",
    replayEngine.list()
  );
}

export function wireReplayHistory(): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface("history", replayEngine.list());
}

export function wireReplaySurface(recommendationId: string) {
  const replay = getRecommendationReplay(recommendationId);
  return {
    surface: "replay" as RecommendationReplaySurface,
    card: presentRecommendationReplayCard(replay),
    detail: presentRecommendationReplayDetail(replay),
    journal: presentDecisionJournal(replay?.journal),
    audit: presentRecommendationAudit(replay?.audit),
    explanation: getHealthExplanation(recommendationId) ?? null,
  };
}

export function wireReplayPortfolio(
  symbols: string[]
): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface(
    "portfolio",
    filterBySymbols(replayEngine.list(), symbols)
  );
}

export function wireReplayWatchlists(
  symbols: string[]
): RecommendationReplaySurfaceBundle {
  return presentRecommendationReplayForSurface(
    "watchlists",
    filterBySymbols(replayEngine.list(), symbols)
  );
}

export { buildRecommendationReplay };
