/**
 * Sprint 9F — recommendation publishability audit helpers.
 * Counts how many OE candidates survive the institutional validator.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  buildFallbackRecommendation,
  buildSharedRecommendation,
  type SharedMarketSnapshot,
} from "@/lib/recommendations/shared-recommendation";
import { validateInstitutionalTradeLevels } from "@/lib/recommendations/recommendation-validator";

export interface RecommendationValidationAudit {
  scannedCandidates: number;
  strategyEngineAccepted: number;
  strategyEngineRejected: number;
  fallbackAccepted: number;
  fallbackRejected: number;
  publishable: number;
  rejected: number;
  rejectionReasons: Record<string, number>;
}

function bump(map: Record<string, number>, reason: string): void {
  map[reason] = (map[reason] ?? 0) + 1;
}

/**
 * Audit one OE snapshot through the same builders used by all EquityOS surfaces.
 */
export function auditRecommendationValidation(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): RecommendationValidationAudit {
  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  const rejectionReasons: Record<string, number> = {};
  let scannedCandidates = 0;
  let strategyEngineAccepted = 0;
  let strategyEngineRejected = 0;
  let fallbackAccepted = 0;
  let fallbackRejected = 0;

  const publishableSymbols = new Set<string>();

  for (const candidate of Object.values(state.categories).flat()) {
    scannedCandidates += 1;
    const symbol = candidate.symbol.toUpperCase();

    const strict = buildSharedRecommendation(candidate, lastScanTime);
    if (strict) {
      strategyEngineAccepted += 1;
      publishableSymbols.add(symbol);
      continue;
    }
    strategyEngineRejected += 1;

    if (candidate.strategySignal && candidate.strategySignal.signal !== "IGNORE") {
      const institutional = validateInstitutionalTradeLevels({
        action:
          candidate.strategySignal.signal === "SELL" ? "SELL" : "BUY",
        entry: candidate.strategySignal.entry,
        stopLoss: candidate.strategySignal.stopLoss,
        targets: [
          candidate.strategySignal.target1,
          candidate.strategySignal.target2,
          candidate.strategySignal.target,
        ],
        holdingPeriod: candidate.strategySignal.holdingPeriod,
        primaryStrategy: candidate.strategySignal.strategy,
      });
      for (const reason of institutional.reasons) bump(rejectionReasons, reason);
      if (institutional.reasons.length === 0) {
        bump(rejectionReasons, "Failed soft Strategy Engine validation gate.");
      }
    }

    const fallback = buildFallbackRecommendation(candidate, lastScanTime, shared);
    if (fallback) {
      fallbackAccepted += 1;
      publishableSymbols.add(symbol);
    } else {
      fallbackRejected += 1;
      bump(rejectionReasons, "Fallback rejected by institutional validator.");
    }
  }

  return {
    scannedCandidates,
    strategyEngineAccepted,
    strategyEngineRejected,
    fallbackAccepted,
    fallbackRejected,
    publishable: publishableSymbols.size,
    rejected: Math.max(0, scannedCandidates - publishableSymbols.size),
    rejectionReasons,
  };
}
