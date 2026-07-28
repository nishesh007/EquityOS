/**
 * Server-only Published Recommendations surface.
 * PostgreSQL persistence, materialization, and OE publish hooks.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  materializePublishedBundleWithQuality,
  pipelineToSharedSnapshot,
} from "@/lib/recommendations/published/materialize";
import {
  assertPublishedConsumerIntegrity,
  isPublishedIntegrityValid,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/integrity";
import {
  loadPublishedBundleFromPostgres,
  persistPublishedBundleToPostgres,
} from "@/lib/recommendations/published/persistence";
import type {
  PublishedConsumerId,
  PublishedConsumerStatus,
  PublishedRecommendationsBundle,
} from "@/lib/recommendations/published/types";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import { filledSlotCount } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { InsightsResearchTerminal } from "@/lib/ai/insights-research";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";

export {
  PUBLISHED_RECOMMENDATION_VERSION,
  PublishedIntegrityError,
} from "@/lib/recommendations/published/types";
export type {
  PublishedRecommendationsBundle,
  PublishedConsumerId,
  PublishedConsumerStatus,
} from "@/lib/recommendations/published/types";
export {
  readPublishedFromState,
} from "@/lib/recommendations/published/client";
export { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";
export {
  materializePublishedBundle,
  materializePublishedBundleWithQuality,
  pipelineToSharedSnapshot,
  flattenHorizonRecommendations,
} from "@/lib/recommendations/published/materialize";
export {
  validatePublishedIntegrity,
  isPublishedIntegrityValid,
  assertPublishedConsumerIntegrity,
} from "@/lib/recommendations/published/integrity";

/**
 * Materialize + attach published dataset to OE state after scan completion.
 * Postgres row persistence is async; memory/state JSON is updated synchronously.
 */
export function publishRecommendationsAfterScan(
  state: OpportunityEngineState
): OpportunityEngineState {
  let breadthScore: number | null = null;
  try {
    const score = getCachedMarketIntelligenceSnapshot()?.context?.breadthScore;
    breadthScore =
      typeof score === "number" && Number.isFinite(score) ? score : null;
  } catch {
    breadthScore = null;
  }

  const { bundle, qualityGate } = materializePublishedBundleWithQuality(
    state,
    pipelineToSharedSnapshot(state),
    breadthScore
  );
  void persistPublishedBundleToPostgres(bundle);
  console.info(
    `[QualityGate] evaluated=${qualityGate.candidatesEvaluated} published=${qualityGate.published} rejected=${qualityGate.rejected}` +
      ` avgConviction=${qualityGate.averageConviction} avgRR=${qualityGate.averageRiskReward}`
  );
  return {
    ...state,
    published: bundle,
    qualityGate,
  };
}

export async function loadPublishedRecommendations(
  state: OpportunityEngineState
): Promise<PublishedRecommendationsBundle | null> {
  const fromState = readPublishedFromState(state);
  if (fromState) return fromState;

  if (!state.tradingDate) return null;
  const fromPg = await loadPublishedBundleFromPostgres(state.tradingDate);
  if (!fromPg) return null;

  validatePublishedIntegrity(fromPg, state);
  return fromPg;
}

export async function loadPublishedRecommendationsList(
  state: OpportunityEngineState
): Promise<SharedRecommendation[]> {
  const bundle = await loadPublishedRecommendations(state);
  return bundle?.recommendations ?? [];
}

export async function loadPublishedStrategyDashboard(
  state: OpportunityEngineState
): Promise<InstitutionalStrategySlot[]> {
  const bundle = await loadPublishedRecommendations(state);
  return bundle?.strategyDashboard ?? [];
}

export async function loadPublishedResearchTerminal(
  state: OpportunityEngineState
): Promise<InsightsResearchTerminal | null> {
  const bundle = await loadPublishedRecommendations(state);
  return bundle?.researchTerminal ?? null;
}

export function buildPublishedStatusReport(
  state: OpportunityEngineState,
  bundle: PublishedRecommendationsBundle | null
): {
  currentSession: string | null;
  latestScanId: string | null;
  publishedCount: number;
  dashboardSlotCount: number;
  filledDashboardSlotCount: number;
  recommendationVersion: string | null;
  generatedAt: string | null;
  consumers: PublishedConsumerStatus[];
} {
  const consumers: PublishedConsumerId[] = [
    "api",
    "dashboard",
    "paper_trading",
    "research",
    "historical_replay",
    "orchestrator",
  ];

  return {
    currentSession: state.tradingDate,
    latestScanId: bundle?.scanId ?? null,
    publishedCount: bundle?.recommendations.length ?? 0,
    dashboardSlotCount: bundle?.strategyDashboard.length ?? 0,
    filledDashboardSlotCount: filledSlotCount(bundle?.strategyDashboard),
    recommendationVersion: bundle?.recommendationVersion ?? null,
    generatedAt: bundle?.generatedAt ?? null,
    consumers: consumers.map((consumer) =>
      assertPublishedConsumerIntegrity(consumer, bundle, state)
    ),
  };
}
