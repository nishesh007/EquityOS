/**
 * Sprint 9F.2 / 9F.4 / 9F.6 — Dashboard adapter from horizon pipelines.
 *
 * Sprint 9F.6: summary cards consume the SAME published horizon rows as
 * recommendation tables. No separate high-conviction gate that can leave
 * cards empty while tables still list ideas.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
} from "@/lib/recommendations/horizons/ids";
import type { SharedMarketSnapshot } from "@/lib/recommendations/shared-recommendation";
import { runHorizonPipelines } from "@/lib/recommendations/horizons/pipeline";
import type {
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";
import { resolvePrice } from "@/lib/recommendations/horizons/metrics";
import type {
  InstitutionalStrategyPick,
  InstitutionalStrategySlot,
} from "@/lib/recommendations/institutional-strategy-dashboard";

function rankRow(row: HorizonRecommendation): number {
  return (
    (row.recommendationQualityScore ?? 0) * 1000 +
    row.selection.score * 10 +
    Math.max(row.recommendation.conviction, row.recommendation.confidence)
  );
}

function toDashboardPick(
  row: HorizonRecommendation,
  lastScanTime: string
): InstitutionalStrategyPick {
  const recommendation = row.recommendation;
  const currentPrice = resolvePrice(row.selection.sourceCandidate);
  const entry = recommendation.entry;
  const entryLow = row.trade.entryLow;
  const entryHigh = row.trade.entryHigh;
  const atMarket =
    currentPrice != null &&
    currentPrice > 0 &&
    Math.abs(currentPrice - entry) / currentPrice <= 0.0015;

  return {
    strategyId: row.horizonId,
    company: row.selection.company,
    symbol: row.selection.symbol,
    currentPrice,
    entry,
    entryMode: entryLow !== entryHigh ? "zone" : "ideal",
    entryLow: entryLow !== entryHigh ? entryLow : null,
    entryHigh: entryLow !== entryHigh ? entryHigh : null,
    entryAtMarket: atMarket,
    primaryTarget: recommendation.targets[0] ?? row.trade.targets[0],
    expectedUpsidePercent: recommendation.expectedReturnPercent ?? null,
    conviction: recommendation.conviction,
    lastScanTime,
  };
}

/**
 * Dashboard slots from a pre-materialized horizon snapshot (published SSOT).
 */
export function selectHorizonDashboardSlotsFromSnapshot(
  snapshot: HorizonPipelineSnapshot,
  lastScanTime: string
): InstitutionalStrategySlot[] {
  return INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
    const rows = snapshot[strategyId];
    const best =
      rows.length === 0
        ? null
        : [...rows].sort((a, b) => rankRow(b) - rankRow(a))[0];

    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      pick: best ? toDashboardPick(best, lastScanTime) : null,
      recommendationCount: rows.length,
      lastScanTime,
    };
  });
}

/**
 * Dashboard slots from independent horizon pipelines.
 * Pick = highest-ranked row in that horizon's published table (same dataset).
 */
export function selectHorizonDashboardSlots(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): InstitutionalStrategySlot[] {
  const snapshot = runHorizonPipelines(state, shared);
  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  return selectHorizonDashboardSlotsFromSnapshot(snapshot, lastScanTime);
}
