/**
 * Recommendation freshness / stale metadata for closed-market serving.
 */

import {
  getMarketStatus,
  getTradingDateKey,
  isMarketOpen,
  isOpportunityScanSession,
  getISTDateKey,
} from "@/lib/market/session";
import { countCategoryCandidates } from "@/lib/opportunity-engine/pipeline-telemetry";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";

export interface RecommendationFreshness {
  generatedAt: string | null;
  marketDate: string | null;
  stale: boolean;
  staleReason: string | null;
  /** Dashboard copy when serving last successful scan. */
  displayMessage: string | null;
  hasRecommendations: boolean;
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function isMarketClosedForRecommendations(now = new Date()): boolean {
  if (isMarketOpen(now) || isOpportunityScanSession(now)) return false;
  const status = getMarketStatus(now);
  return status === "closed" || status === "holiday" || status === "post_close";
}

/** True when stored scan timestamp is from a prior IST trading date. */
export function isCarryForwardScan(
  state: OpportunityEngineState,
  now = new Date()
): boolean {
  if (!state.lastScannedAt) return false;
  const scannedDay = getISTDateKey(new Date(state.lastScannedAt));
  const tradingDay = state.tradingDate ?? getTradingDateKey(now);
  return scannedDay !== tradingDay;
}

export function buildRecommendationFreshness(
  state: OpportunityEngineState,
  recommendationCount?: number,
  now = new Date()
): RecommendationFreshness {
  const generatedAt = state.lastScannedAt;
  const marketDate = state.tradingDate ?? getTradingDateKey(now);
  const hasRecommendations =
    typeof recommendationCount === "number"
      ? recommendationCount > 0
      : countCategoryCandidates(state.categories) > 0 ||
        (state.recommendations?.length ?? 0) > 0;

  const marketClosed = isMarketClosedForRecommendations(now);
  const carryForward = isCarryForwardScan(state, now);

  if (hasRecommendations && (marketClosed || carryForward)) {
    const when = generatedAt ? formatGeneratedAt(generatedAt) : marketDate;
    const staleReason = marketClosed
      ? "Market Closed"
      : "Awaiting today's market scan";
    return {
      generatedAt,
      marketDate,
      stale: true,
      staleReason,
      displayMessage: `Showing latest validated recommendations generated on ${when}.`,
      hasRecommendations: true,
    };
  }

  if (hasRecommendations && generatedAt) {
    return {
      generatedAt,
      marketDate,
      stale: false,
      staleReason: null,
      displayMessage: `Showing latest validated recommendations generated on ${formatGeneratedAt(generatedAt)}.`,
      hasRecommendations: true,
    };
  }

  return {
    generatedAt,
    marketDate,
    stale: false,
    staleReason: null,
    displayMessage: null,
    hasRecommendations,
  };
}
