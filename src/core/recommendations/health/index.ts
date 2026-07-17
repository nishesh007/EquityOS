/**
 * Sprint 9F.1.R3 – Recommendation Health Engine public API.
 *
 * Original Conviction remains frozen on the R1 snapshot.
 * Current Health evolves from engine-supplied factor scores.
 * This module never recalculates conviction, trust, or validation engines.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import {
  buildHealthExplanation,
  calculateConvictionDrift,
} from "./ConvictionDriftEngine";
import {
  RecommendationHealthEngine,
  calculateHealth,
} from "./RecommendationHealthEngine";
import type {
  CalculateHealthInput,
  ConvictionDriftResult,
  RecommendationHealthAssessment,
  RecommendationHealthExplanation,
  RecommendationHealthFactor,
  RecommendationHealthFactorInput,
} from "./RecommendationHealthModels";
import {
  presentRecommendationHealthCard,
  presentRecommendationHealthDetail,
  presentRecommendationHealthForSurface,
  type RecommendationHealthSurface,
  type RecommendationHealthSurfaceBundle,
} from "./RecommendationHealthPresentationModels";

export * from "./RecommendationHealthModels";
export {
  RecommendationHealthEngine,
  calculateHealth,
} from "./RecommendationHealthEngine";
export * from "./ConvictionDriftEngine";
export * from "./HealthFactorEngine";
export * from "./RecommendationHealthPresentationModels";

const healthEngine = new RecommendationHealthEngine();

/** Optional snapshot loader bound by the parent recommendations barrel. */
let snapshotLoader:
  | ((recommendationId: string) => RecommendationSnapshot | undefined)
  | null = null;

export function bindRecommendationHealthSnapshotLoader(
  loader: (recommendationId: string) => RecommendationSnapshot | undefined
): void {
  snapshotLoader = loader;
}

function requireSnapshot(recommendationId: string): RecommendationSnapshot {
  const cached = healthEngine.get(recommendationId)?.snapshot;
  if (cached) return cached;
  const loaded = snapshotLoader?.(recommendationId);
  if (!loaded) {
    throw new Error(`Recommendation ${recommendationId} not found for health`);
  }
  return loaded;
}

export function calculateHealthAssessment(
  input: CalculateHealthInput
): RecommendationHealthAssessment {
  return healthEngine.calculate(input);
}

export function getRecommendationHealth(
  recommendationId: string
): RecommendationHealthAssessment | undefined {
  const existing = healthEngine.get(recommendationId);
  if (existing) return existing;
  const snapshot = snapshotLoader?.(recommendationId);
  if (!snapshot) return undefined;
  return healthEngine.calculate({ snapshot });
}

export function calculateHealthForRecommendation(
  recommendationId: string,
  factors?: RecommendationHealthFactorInput,
  options?: { invalidated?: boolean; asOf?: string | Date }
): RecommendationHealthAssessment {
  const snapshot = requireSnapshot(recommendationId);
  return healthEngine.calculate({
    snapshot,
    factors,
    invalidated: options?.invalidated,
    asOf: options?.asOf,
  });
}

/** Public alias matching the sprint API name. */
export function calculateHealthScore(
  snapshot: RecommendationSnapshot,
  factors?: RecommendationHealthFactorInput
): number {
  return calculateHealth({ snapshot, factors }).current.currentHealth;
}

export function calculateConvictionDriftForRecommendation(
  recommendationId: string,
  factors?: RecommendationHealthFactorInput
): ConvictionDriftResult {
  const assessment = calculateHealthForRecommendation(recommendationId, factors);
  return assessment.drift;
}

export function calculateConvictionDriftFromSnapshot(
  snapshot: RecommendationSnapshot,
  currentHealth: number,
  factors: readonly RecommendationHealthFactor[] = []
): ConvictionDriftResult {
  return calculateConvictionDrift(
    snapshot.originalConviction,
    currentHealth,
    factors
  );
}

export function getHealthFactors(
  recommendationId: string
): readonly RecommendationHealthFactor[] | undefined {
  if (!healthEngine.get(recommendationId)) {
    const snapshot = snapshotLoader?.(recommendationId);
    if (!snapshot) return undefined;
    healthEngine.calculate({ snapshot });
  }
  return healthEngine.getFactors(recommendationId);
}

export function getHealthExplanation(
  recommendationId: string
): RecommendationHealthExplanation | undefined {
  if (!healthEngine.get(recommendationId)) {
    const snapshot = snapshotLoader?.(recommendationId);
    if (!snapshot) return undefined;
    healthEngine.calculate({ snapshot });
  }
  return healthEngine.getExplanation(recommendationId);
}

export function listRecommendationHealth(): RecommendationHealthAssessment[] {
  return healthEngine.list();
}

export function resetRecommendationHealth(): void {
  healthEngine.clear();
}

export function getRecommendationHealthEngine(): RecommendationHealthEngine {
  return healthEngine;
}

function filterBySymbol(
  assessments: RecommendationHealthAssessment[],
  symbol?: string
): RecommendationHealthAssessment[] {
  if (!symbol) return assessments;
  const normalized = symbol.trim().toUpperCase();
  return assessments.filter(
    (item) => item.snapshot.company.symbol.toUpperCase() === normalized
  );
}

function filterBySymbols(
  assessments: RecommendationHealthAssessment[],
  symbols: string[]
): RecommendationHealthAssessment[] {
  const set = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  return assessments.filter((item) =>
    set.has(item.snapshot.company.symbol.toUpperCase())
  );
}

export function wireHealthDashboard(): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface("dashboard", healthEngine.list());
}

export function wireHealthCompany(symbol: string): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface(
    "company",
    filterBySymbol(healthEngine.list(), symbol)
  );
}

export function wireHealthResearch(): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface("research", healthEngine.list());
}

export function wireHealthRecommendationCenter(): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface(
    "recommendation_center",
    healthEngine.list()
  );
}

export function wireHealthPortfolio(
  symbols: string[]
): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface(
    "portfolio",
    filterBySymbols(healthEngine.list(), symbols)
  );
}

export function wireHealthWatchlists(
  symbols: string[]
): RecommendationHealthSurfaceBundle {
  return presentRecommendationHealthForSurface(
    "watchlists",
    filterBySymbols(healthEngine.list(), symbols)
  );
}

export function wireHealthReplay(recommendationId: string) {
  const assessment = getRecommendationHealth(recommendationId);
  return {
    surface: "replay" as RecommendationHealthSurface,
    card: presentRecommendationHealthCard(assessment),
    detail: presentRecommendationHealthDetail(assessment),
    explanation: assessment?.explanation ?? buildHealthExplanation([], [], []),
  };
}
