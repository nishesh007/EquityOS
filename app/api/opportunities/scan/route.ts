import { NextRequest, NextResponse } from "next/server";
import {
  requestBackgroundOpportunityScan,
  triggerOpportunityScan,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { getStrategyPlatformStatus } from "@/src/modules/strategies";
import { selectRecommendationsWithFallback } from "@/lib/recommendations";

/**
 * POST /api/opportunities/scan
 * - ?async=1 → accept and kick background scan (dashboard post-hydrate). Never awaits OE.
 * - default → await scan (manual "Refresh Strategy Scan" button).
 */
export async function POST(request: NextRequest) {
  const asyncMode =
    request.nextUrl.searchParams.get("async") === "1" ||
    request.nextUrl.searchParams.get("background") === "1";

  if (asyncMode) {
    requestBackgroundOpportunityScan();
    return NextResponse.json(
      { accepted: true, mode: "async" },
      { status: 202 }
    );
  }

  const result = await triggerOpportunityScan();
  const state = result.state;

  return NextResponse.json({
    success: true,
    state,
    recommendations: selectRecommendationsWithFallback(
      state,
      toSharedSnapshot(result.marketIntelligence)
    ),
    durationMs: result.durationMs,
    symbolsScanned: result.symbolsScanned,
    added: result.added,
    removed: result.removed,
    updated: result.updated,
    marketIntelligence: result.marketIntelligence,
    strategyPlatform: getStrategyPlatformStatus(),
    pipeline: state.pipeline ?? null,
    eligibility: {
      eligibleStrategyCount: state.pipeline?.eligibleStrategyCount ?? 0,
      rejectedStrategyCount: state.pipeline?.rejectedStrategyCount ?? 0,
      strategies: state.pipeline?.eligibleStrategies ?? [],
      regime: state.pipeline?.regime ?? null,
      confidence: state.pipeline?.confidence ?? null,
    },
    context: result.marketIntelligence.context,
    regime: result.marketIntelligence.regime,
    confidence: result.marketIntelligence.confidence,
  });
}

/** Lightweight status without starting a scan. */
export async function GET() {
  const { peekOpportunityEngineState } = await import(
    "@/services/opportunityEngine"
  );
  const { getSchedulerObservability } = await import(
    "@/lib/opportunity-engine/scheduler-observability"
  );
  const state = peekOpportunityEngineState();
  const mi = getCachedMarketIntelligenceSnapshot();
  const recommendationCount = selectRecommendationsWithFallback(
    state,
    toSharedSnapshot(mi)
  ).length;
  const obs = getSchedulerObservability();
  return NextResponse.json({
    isScanning: state.isScanning,
    isFrozen: state.isFrozen,
    lastScannedAt: state.lastScannedAt,
    scanCount: state.scanCount,
    recommendationCount,
    lastError: obs.lastError?.message ?? null,
  });
}
