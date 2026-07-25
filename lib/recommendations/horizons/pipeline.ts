/**
 * Sprint 9F.2 — Horizon-First Recommendation Pipeline orchestrator.
 *
 * Runs seven independent pipelines over one OE metrics universe.
 * Does NOT assign OE categories as horizons.
 */

import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import { validateInstitutionalTradeLevels } from "@/lib/recommendations/recommendation-validator";
import type {
  SharedMarketSnapshot,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";
import { selectForHorizon } from "@/lib/recommendations/horizons/selection";
import { constructTradeForHorizon } from "@/lib/recommendations/horizons/trade";
import {
  calibrateHorizonSnapshot,
  type CalibrationAuditReport,
} from "@/lib/recommendations/horizons/calibration";
import type {
  HorizonId,
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";
import { buildHorizonUniverse } from "@/lib/recommendations/horizons/universe";
import {
  filterUniverseByTradability,
  type TradabilityAuditReport,
} from "@/lib/recommendations/tradability";
import {
  resolveRecommendationConflicts,
  type ConflictAuditReport,
} from "@/lib/recommendations/conflict-validator";

const HORIZON_LIMITS: Record<HorizonId, number> = {
  scalping: 12,
  intraday: 16,
  btst: 12,
  swing: 14,
  short_term: 12,
  medium_term: 12,
  long_term: 10,
};

let cachedKey = "";
let cachedSnapshot: HorizonPipelineSnapshot | null = null;
let cachedAudit: CalibrationAuditReport | null = null;
let cachedTradabilityAudit: TradabilityAuditReport | null = null;
let cachedConflictAudit: ConflictAuditReport | null = null;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toSharedRecommendation(
  horizon: HorizonRecommendation["selection"],
  trade: HorizonRecommendation["trade"],
  lastScanTime: string,
  shared?: SharedMarketSnapshot
): SharedRecommendation | null {
  const candidate = horizon.sourceCandidate;
  const action = horizon.side === "Short" ? ("SELL" as const) : ("BUY" as const);

  const institutional = validateInstitutionalTradeLevels({
    action,
    entry: trade.entry,
    entryLow: trade.entryLow,
    entryHigh: trade.entryHigh,
    stopLoss: trade.stopLoss,
    targets: trade.targets,
    holdingPeriod: trade.holdingPeriod,
    primaryStrategy: horizon.primaryStrategy,
    currentPrice: candidate.quote?.price ?? null,
    statedRiskReward: trade.riskReward,
  });
  if (!institutional.valid || !institutional.metrics) return null;

  // Confidence / conviction are sealed once in Sprint 9F.3/9F.4 calibration.
  // Do not compute a second confidence engine here.
  const confidence = 0;
  const conviction = 0;

  const checks = {
    tradeLevels: true,
    institutionalTradeLevels: true,
    confidence: true, // sealed in calibration
    opportunityScore: true,
    agreement: true,
    marketContext: true,
    marketRegime: true,
    eligibility: candidate.pipelineEligible !== false,
  };

  return {
    id: `horizon:${horizon.horizonId}:${horizon.symbol}`,
    symbol: horizon.symbol,
    company: horizon.company,
    category: candidate.category,
    action,
    primaryStrategy: horizon.primaryStrategy,
    primaryStrategyId: horizon.horizonId,
    matchedStrategies: [
      horizon.primaryStrategy,
      ...horizon.supportingStrategies,
    ],
    supportingStrategies: horizon.supportingStrategies,
    opposingStrategies: [],
    strategyCount: 1 + horizon.supportingStrategies.length,
    agreementPercent: round2(Math.min(100, horizon.score)),
    conflictPercent: 0,
    opportunityScore: Math.round(horizon.score),
    frameworkScore: Math.round(horizon.score),
    confidence,
    conviction,
    entry: institutional.metrics.entry,
    entryLow: trade.entryLow,
    entryHigh: trade.entryHigh,
    stopLoss: institutional.metrics.stopLoss,
    targets: institutional.metrics.targets,
    risk: institutional.metrics.risk,
    reward: institutional.metrics.reward,
    riskReward: round2(institutional.metrics.riskReward),
    expectedReturnPercent: institutional.metrics.expectedReturnPercent,
    holdingPeriod: trade.holdingPeriod,
    marketContext:
      candidate.marketTrend ||
      shared?.marketTrend ||
      candidate.strategySignal?.marketContext ||
      "Horizon pipeline",
    marketRegime:
      candidate.marketRegime ||
      shared?.regime ||
      candidate.strategySignal?.marketRegime ||
      "Horizon pipeline",
    riskMode: candidate.riskMode ?? shared?.riskMode ?? "Neutral",
    eligibility: {
      eligible: true,
      score: horizon.score,
      reasons: horizon.belongsBecause,
    },
    reasons: [
      ...horizon.belongsBecause,
      ...horizon.qualifiedFactors.slice(0, 4),
      trade.targetMethodology,
    ],
    evidence: [
      ...horizon.qualifiedFactors,
      trade.holdingRationale,
      trade.targetMethodology,
    ],
    matchedFactors: horizon.qualifiedFactors,
    matchedFactorCount: horizon.qualifiedFactors.length,
    totalFactorCount: horizon.factors.length,
    matchedFrameworks: {
      technical: horizon.qualifiedFactors.filter((f) =>
        /EMA|ADX|VWAP|MACD|trend|volume|ATR|breakout|pattern/i.test(f)
      ),
      fundamental: horizon.qualifiedFactors.filter((f) =>
        /ROE|fundamental|growth|PEG|quality|valuation|earnings/i.test(f)
      ),
      valuation: horizon.qualifiedFactors.filter((f) =>
        /PE|PEG|valuation|intrinsic|Buffett|Graham/i.test(f)
      ),
      growth: horizon.qualifiedFactors.filter((f) =>
        /growth|momentum|RS|revenue|earnings/i.test(f)
      ),
    },
    validation: {
      valid: true,
      score: 100,
      checks,
      reasons: [`Horizon-first pipeline validated for ${horizon.horizonId}.`],
    },
    longTermRanking: candidate.longTermRanking ?? null,
    timestamp: lastScanTime,
    source: "OpportunityEngine",
  };
}

function buildHorizonRecommendation(
  selection: ReturnType<typeof selectForHorizon>[number],
  lastScanTime: string,
  shared?: SharedMarketSnapshot
): HorizonRecommendation | null {
  const trade = constructTradeForHorizon(selection);
  if (!trade) return null;

  const recommendation = toSharedRecommendation(
    selection,
    trade,
    lastScanTime,
    shared
  );
  if (!recommendation) return null;

  return {
    horizonId: selection.horizonId,
    selection,
    trade,
    recommendation,
    quality: {
      whyThisHorizon: selection.belongsBecause,
      qualifiedFactors: selection.qualifiedFactors,
      rejectedFactors: selection.rejectedFactors,
      shorterLongerFit: selection.horizonFitNotes,
      primaryStrategy: selection.primaryStrategy,
      supportingStrategies: selection.supportingStrategies,
      holdingRationale: trade.holdingRationale,
      targetMethodology: trade.targetMethodology,
    },
  };
}

/**
 * Soft cross-horizon policy removed in 9F.3 — replaced by justified
 * duplicate policy inside calibrateHorizonSnapshot.
 */

/**
 * Run all seven independent horizon pipelines once per OE snapshot,
 * then apply institutional calibration (holding / ER / RR / confidence / Q).
 */
export function runHorizonPipelines(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): HorizonPipelineSnapshot {
  const key = `v9f6:${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}:${shared?.regime ?? ""}`;
  if (key === cachedKey && cachedSnapshot) return cachedSnapshot;

  const universe = buildHorizonUniverse(state);
  // Sprint 9F.5 — Liquidity / Tradability BEFORE strategy ranking.
  const { eligible: tradableUniverse, audit: tradabilityAudit } =
    filterUniverseByTradability(universe);
  cachedTradabilityAudit = tradabilityAudit;

  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  const raw = {} as HorizonPipelineSnapshot;

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    const selected = selectForHorizon(horizonId, tradableUniverse);
    const built: HorizonRecommendation[] = [];
    for (const selection of selected) {
      if (built.length >= HORIZON_LIMITS[horizonId] * 2) break;
      const recommendation = buildHorizonRecommendation(
        selection,
        lastScanTime,
        shared
      );
      if (recommendation) built.push(recommendation);
    }
    raw[horizonId] = built;
  }

  const { snapshot: calibrated, audit } = calibrateHorizonSnapshot(raw);
  // Sprint 9F.6 — BUY/SELL conflict resolution across horizons.
  const { snapshot: conflicted, audit: conflictAudit } =
    resolveRecommendationConflicts(calibrated);
  cachedConflictAudit = conflictAudit;
  const snapshot = conflicted;

  // Enforce per-horizon publish limits after calibration + conflict resolution.
  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    snapshot[horizonId] = snapshot[horizonId]
      .sort(
        (a, b) =>
          (b.recommendationQualityScore ?? 0) -
            (a.recommendationQualityScore ?? 0) ||
          b.selection.score - a.selection.score
      )
      .slice(0, HORIZON_LIMITS[horizonId]);
    audit.remainingByHorizon[horizonId] = snapshot[horizonId].length;
  }

  cachedKey = key;
  cachedSnapshot = snapshot;
  cachedAudit = audit;
  return snapshot;
}

/** Latest calibration audit for the cached pipeline run. */
export function getHorizonCalibrationAudit(): CalibrationAuditReport | null {
  return cachedAudit;
}

/** Latest tradability / liquidity filter audit (Sprint 9F.5). */
export function getTradabilityAudit(): TradabilityAuditReport | null {
  return cachedTradabilityAudit;
}

/** Latest BUY/SELL conflict audit (Sprint 9F.6). */
export function getConflictAudit(): ConflictAuditReport | null {
  return cachedConflictAudit;
}

/** Test helper — clear pipeline cache. */
export function clearHorizonPipelineCache(): void {
  cachedKey = "";
  cachedSnapshot = null;
  cachedAudit = null;
  cachedTradabilityAudit = null;
  cachedConflictAudit = null;
}

/** Diagnostic: prove lists are independently generated. */
export function horizonPipelineIndependenceReport(
  snapshot: HorizonPipelineSnapshot
): {
  counts: Record<HorizonId, number>;
  overlapPairs: Array<{ a: HorizonId; b: HorizonId; shared: number }>;
  methodologies: Record<HorizonId, string[]>;
} {
  const counts = {} as Record<HorizonId, number>;
  const methodologies = {} as Record<HorizonId, string[]>;
  const sets = {} as Record<HorizonId, Set<string>>;

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    const rows = snapshot[horizonId];
    counts[horizonId] = rows.length;
    sets[horizonId] = new Set(rows.map((r) => r.selection.symbol));
    methodologies[horizonId] = [
      ...new Set(rows.map((r) => r.trade.methodology)),
    ];
  }

  const overlapPairs: Array<{ a: HorizonId; b: HorizonId; shared: number }> =
    [];
  for (let i = 0; i < INSTITUTIONAL_STRATEGY_IDS.length; i++) {
    for (let j = i + 1; j < INSTITUTIONAL_STRATEGY_IDS.length; j++) {
      const a = INSTITUTIONAL_STRATEGY_IDS[i];
      const b = INSTITUTIONAL_STRATEGY_IDS[j];
      let shared = 0;
      for (const symbol of sets[a]) {
        if (sets[b].has(symbol)) shared += 1;
      }
      if (shared > 0) overlapPairs.push({ a, b, shared });
    }
  }

  return { counts, overlapPairs, methodologies };
}
