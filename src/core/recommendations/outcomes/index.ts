/**
 * Sprint 9F.1.R5 – Recommendation Outcome Intelligence public API.
 *
 * Lifecycle-complete evaluation. No fake A/B/C/D grades.
 * Reuses R1 snapshot, R2 lifecycle, R3 health — no duplicated conviction math.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import { getLivingRecommendation } from "../lifecycle";
import { getRecommendationHealth } from "../health";
import {
  RecommendationOutcomeEngine,
  evaluateRecommendationOutcome,
} from "./RecommendationOutcomeEngine";
import {
  getInstitutionalVerdict,
  summarizeRecommendationOutcomes,
} from "./RecommendationPerformanceEngine";
import { trackRecommendationTargets } from "./RecommendationTargetTracker";
import type {
  EvaluateRecommendationOutcomeInput,
  InstitutionalVerdict,
  RecommendationOutcomeAssessment,
  RecommendationOutcomeSummary,
  RecommendationPerformanceMetrics,
  RecommendationPricePathInput,
  RecommendationTargetProgress,
} from "./RecommendationOutcomeModels";
import {
  presentHighestConvictionOutcomeCard,
  presentOutcomePanelRow,
  presentRecommendationOutcomesForSurface,
  type RecommendationOutcomeSurface,
  type RecommendationOutcomeSurfaceBundle,
} from "./RecommendationOutcomePresentationModels";

export * from "./RecommendationOutcomeModels";
export * from "./RecommendationOutcomeEngine";
export * from "./RecommendationTargetTracker";
export * from "./RecommendationPerformanceEngine";
export * from "./RecommendationOutcomePresentationModels";

const outcomeEngine = new RecommendationOutcomeEngine();

let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;

export function bindRecommendationOutcomeSnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined
): void {
  snapshotLoader = loader;
}

function requireSnapshot(recommendationId: string): RecommendationSnapshot {
  const cached = outcomeEngine.get(recommendationId)?.snapshot;
  if (cached) return cached;
  const loaded = snapshotLoader?.(recommendationId);
  if (!loaded) {
    throw new Error(`Recommendation ${recommendationId} not found for outcomes`);
  }
  return loaded;
}

function composeOutcome(
  recommendationId: string,
  path?: RecommendationPricePathInput
): RecommendationOutcomeAssessment {
  const snapshot = requireSnapshot(recommendationId);
  return outcomeEngine.evaluate({
    snapshot,
    lifecycle: getLivingRecommendation(recommendationId) ?? null,
    health: getRecommendationHealth(recommendationId) ?? null,
    path,
  });
}

export function getRecommendationOutcome(
  recommendationId: string,
  path?: RecommendationPricePathInput
): RecommendationOutcomeAssessment | undefined {
  if (!path) {
    const existing = outcomeEngine.get(recommendationId);
    if (existing) return existing;
  }
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return outcomeEngine.get(recommendationId);
  return composeOutcome(recommendationId, path);
}

export function trackRecommendationTargetsForId(
  recommendationId: string,
  path?: RecommendationPricePathInput
): RecommendationTargetProgress | undefined {
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return outcomeEngine.get(recommendationId)?.targets;
  return trackRecommendationTargets(
    snapshot,
    getLivingRecommendation(recommendationId) ?? null,
    path
  );
}

/** Public alias matching the sprint API name. */
export function trackRecommendationTargetsApi(
  recommendationId: string,
  path?: RecommendationPricePathInput
): RecommendationTargetProgress | undefined {
  return trackRecommendationTargetsForId(recommendationId, path);
}

export { trackRecommendationTargets };

export function getRecommendationPerformance(
  recommendationId: string,
  path?: RecommendationPricePathInput
): RecommendationPerformanceMetrics | undefined {
  return getRecommendationOutcome(recommendationId, path)?.performance;
}

export function getInstitutionalVerdictForRecommendation(
  recommendationId: string,
  path?: RecommendationPricePathInput
): InstitutionalVerdict | undefined {
  const outcome = getRecommendationOutcome(recommendationId, path);
  return outcome?.verdict;
}

/** Public alias matching the sprint API name. */
export function getInstitutionalVerdictApi(
  recommendationId: string,
  path?: RecommendationPricePathInput
): InstitutionalVerdict | undefined {
  return getInstitutionalVerdictForRecommendation(recommendationId, path);
}

export { getInstitutionalVerdict };

export function getOutcomeSummary(): RecommendationOutcomeSummary {
  return outcomeEngine.summary();
}

export function evaluateAndStoreOutcome(
  input: EvaluateRecommendationOutcomeInput
): RecommendationOutcomeAssessment {
  return outcomeEngine.evaluate(input);
}

export function listRecommendationOutcomes(): RecommendationOutcomeAssessment[] {
  return outcomeEngine.list();
}

export function resetRecommendationOutcomes(): void {
  outcomeEngine.clear();
}

export function getRecommendationOutcomeEngine(): RecommendationOutcomeEngine {
  return outcomeEngine;
}

export { evaluateRecommendationOutcome };

function filterBySymbol(
  items: RecommendationOutcomeAssessment[],
  symbol?: string
): RecommendationOutcomeAssessment[] {
  if (!symbol) return items;
  const normalized = symbol.trim().toUpperCase();
  return items.filter(
    (item) => item.snapshot.company.symbol.toUpperCase() === normalized
  );
}

function filterBySymbols(
  items: RecommendationOutcomeAssessment[],
  symbols: string[]
): RecommendationOutcomeAssessment[] {
  const set = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  return items.filter((item) =>
    set.has(item.snapshot.company.symbol.toUpperCase())
  );
}

export function wireOutcomeDashboard(): RecommendationOutcomeSurfaceBundle {
  return presentRecommendationOutcomesForSurface(
    "dashboard",
    outcomeEngine.list(),
    outcomeEngine.summary()
  );
}

export function wireOutcomeCompany(symbol: string): RecommendationOutcomeSurfaceBundle {
  return presentRecommendationOutcomesForSurface(
    "company",
    filterBySymbol(outcomeEngine.list(), symbol),
    summarizeRecommendationOutcomes(filterBySymbol(outcomeEngine.list(), symbol))
  );
}

export function wireOutcomeResearch(): RecommendationOutcomeSurfaceBundle {
  return presentRecommendationOutcomesForSurface(
    "research",
    outcomeEngine.list(),
    outcomeEngine.summary()
  );
}

export function wireOutcomeRecommendationCenter(): RecommendationOutcomeSurfaceBundle {
  return presentRecommendationOutcomesForSurface(
    "recommendation_center",
    outcomeEngine.list(),
    outcomeEngine.summary()
  );
}

export function wireOutcomePortfolio(
  symbols: string[]
): RecommendationOutcomeSurfaceBundle {
  const items = filterBySymbols(outcomeEngine.list(), symbols);
  return presentRecommendationOutcomesForSurface(
    "portfolio",
    items,
    summarizeRecommendationOutcomes(items)
  );
}

export function wireOutcomeReplay(recommendationId: string) {
  const outcome = getRecommendationOutcome(recommendationId);
  return {
    surface: "replay" as RecommendationOutcomeSurface,
    row: presentOutcomePanelRow(outcome),
    card: presentHighestConvictionOutcomeCard(outcome),
    attribution: outcome?.attribution ?? null,
    summary: outcomeEngine.summary(),
  };
}

export function wireOutcomeHistory(): RecommendationOutcomeSurfaceBundle {
  return presentRecommendationOutcomesForSurface(
    "history",
    outcomeEngine.listCompleted(),
    summarizeRecommendationOutcomes(outcomeEngine.listCompleted())
  );
}

export function wireOutcomeWatchlists(
  symbols: string[]
): RecommendationOutcomeSurfaceBundle {
  const items = filterBySymbols(outcomeEngine.list(), symbols);
  return presentRecommendationOutcomesForSurface(
    "watchlists",
    items,
    summarizeRecommendationOutcomes(items)
  );
}
