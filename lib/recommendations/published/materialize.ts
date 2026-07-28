import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import { selectInsightsResearchTerminalFromSnapshot } from "@/lib/ai/insights-research";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import { selectHorizonDashboardSlotsFromSnapshot } from "@/lib/recommendations/horizons/adapters";
import { runHorizonPipelines } from "@/lib/recommendations/horizons/pipeline";
import type { HorizonPipelineSnapshot } from "@/lib/recommendations/horizons/types";
import type {
  SharedMarketSnapshot,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";
import { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";
import {
  PUBLISHED_RECOMMENDATION_VERSION,
  type PublishedRecommendationsBundle,
} from "@/lib/recommendations/published/types";
import {
  applyRecommendationQualityGate,
  buildQualityGateMarketContext,
  type QualityGateReport,
} from "@/lib/recommendations/quality-gate";

export function pipelineToSharedSnapshot(
  state: OpportunityEngineState
): SharedMarketSnapshot | undefined {
  const pipeline = state.pipeline;
  if (!pipeline) return undefined;
  return {
    regime: pipeline.regime,
    marketTrend: pipeline.marketTrend,
    riskMode: pipeline.riskMode,
    confidence: pipeline.confidence,
  };
}

export function flattenHorizonRecommendations(
  snapshot: HorizonPipelineSnapshot
): SharedRecommendation[] {
  const byId = new Map<string, SharedRecommendation>();
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    for (const row of snapshot[horizonId]) {
      const recommendation = row.recommendation;
      if (!byId.has(recommendation.id)) {
        byId.set(recommendation.id, recommendation);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      Math.max(b.conviction, b.confidence) -
        Math.max(a.conviction, a.confidence) ||
      b.opportunityScore - a.opportunityScore
  );
}

function resolveBreadthScore(): number | null {
  return null;
}

export interface MaterializePublishedResult {
  bundle: PublishedRecommendationsBundle;
  qualityGate: QualityGateReport;
}

/**
 * Materialize the canonical published dataset from OE scan state.
 * Horizon pipelines run once, then Quality Gate filters before publish.
 */
export function materializePublishedBundle(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): PublishedRecommendationsBundle {
  return materializePublishedBundleWithQuality(state, shared).bundle;
}

export function materializePublishedBundleWithQuality(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot,
  breadthScore?: number | null
): MaterializePublishedResult {
  const sessionId = state.tradingDate ?? "unknown";
  const generatedAt = state.lastScannedAt ?? new Date().toISOString();
  const scanId = buildPublishedScanId(sessionId, state.scanCount);
  const marketSnapshot = shared ?? pipelineToSharedSnapshot(state);
  const rawSnapshot = runHorizonPipelines(state, marketSnapshot);
  const market = buildQualityGateMarketContext(
    state,
    marketSnapshot,
    breadthScore ?? resolveBreadthScore()
  );
  const { snapshot: qualitySnapshot, report: qualityGate } =
    applyRecommendationQualityGate(rawSnapshot, state, market);
  const lastScanTime = state.lastScannedAt ?? generatedAt;

  return {
    qualityGate,
    bundle: {
      sessionId,
      scanId,
      generatedAt,
      recommendationVersion: PUBLISHED_RECOMMENDATION_VERSION,
      recommendations: flattenHorizonRecommendations(qualitySnapshot),
      strategyDashboard: selectHorizonDashboardSlotsFromSnapshot(
        qualitySnapshot,
        lastScanTime
      ),
      researchTerminal: selectInsightsResearchTerminalFromSnapshot(
        qualitySnapshot,
        lastScanTime
      ),
    },
  };
}
