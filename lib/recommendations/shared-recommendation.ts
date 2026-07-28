import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
  OpportunityLongTermRanking,
  OpportunityStrategyConsensus,
  OpportunityStrategySignal,
} from "@/lib/opportunity-engine/types";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import { constructDynamicTrade } from "@/lib/opportunity-engine/dynamic-trade-construction";
import {
  computeTradeMetrics,
  validateInstitutionalTradeLevels,
} from "@/lib/recommendations/recommendation-validator";
import { ensureThreeTargets } from "@/lib/recommendations/institutional-horizons";

export type RecommendationAction =
  | "BUY"
  | "SELL"
  | "WATCHLIST";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseHoldingDaysMid(label: string): number | null {
  const monthMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Months/i);
  if (monthMatch) {
    return ((Number(monthMatch[1]) + Number(monthMatch[2])) / 2) * 21;
  }
  const dayMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Trading Days/i);
  if (dayMatch) {
    return (Number(dayMatch[1]) + Number(dayMatch[2])) / 2;
  }
  const minuteMatch = label.match(/(\d+)\s*[–-]\s*(\d+)\s*Minutes/i);
  if (minuteMatch) {
    return (Number(minuteMatch[1]) + Number(minuteMatch[2])) / 2 / 375;
  }
  return null;
}

/**
 * Resolve dynamic holding period — never fall back to fixed category templates.
 */
function resolveDynamicHoldingPeriod(
  candidate: OpportunityCandidate,
  signalHolding?: string | null
): string {
  const fromCandidate = candidate.timeHorizon?.trim();
  if (fromCandidate && fromCandidate !== "Unavailable") return fromCandidate;

  const price =
    candidate.quote?.price ??
    (typeof candidate.scanMetrics?.cmp === "number"
      ? Number(candidate.scanMetrics.cmp)
      : (candidate.entryZone.low + candidate.entryZone.high) / 2);

  if (price > 0) {
    const dynamic = constructDynamicTrade({
      price,
      side: candidate.side,
      category: candidate.category,
      metrics: candidate.scanMetrics,
      strategyId: candidate.strategyId,
      strategyName: candidate.strategyName,
      strategySignal: candidate.strategySignal,
      supportingStrategyNames:
        candidate.strategyConsensus?.supportingStrategies ?? [],
      conviction: candidate.aiConvictionScore,
      confidence: candidate.confidencePercent,
    });
    if (dynamic.holdingPeriod && dynamic.holdingPeriod !== "Unavailable") {
      return dynamic.holdingPeriod;
    }
  }

  const fromSignal = signalHolding?.trim();
  if (fromSignal) return fromSignal;
  return "Estimated holding unavailable";
}

export interface SharedRecommendationValidation {
  valid: boolean;
  score: number;
  checks: {
    tradeLevels: boolean;
    institutionalTradeLevels: boolean;
    confidence: boolean;
    opportunityScore: boolean;
    agreement: boolean;
    marketContext: boolean;
    marketRegime: boolean;
    eligibility: boolean;
  };
  reasons: string[];
}

/** The single application-facing recommendation contract. */
export interface SharedRecommendation {
  id: string;
  symbol: string;
  company: string;
  category: OpportunityCandidate["category"];
  action: RecommendationAction;
  primaryStrategy: string;
  primaryStrategyId: string;
  matchedStrategies: string[];
  supportingStrategies: string[];
  opposingStrategies: string[];
  strategyCount: number;
  agreementPercent: number;
  conflictPercent: number;
  opportunityScore: number;
  frameworkScore: number;
  confidence: number;
  conviction: number;
  entry: number;
  stopLoss: number;
  targets: number[];
  risk: number;
  reward: number;
  riskReward: number;
  /** Canonical Expected Return % — Target1 from Effective Entry (Sprint 9F.4). */
  expectedReturnPercent?: number;
  /** Entry range low (display must match; Effective Entry = midpoint). */
  entryLow?: number;
  /** Entry range high. */
  entryHigh?: number;
  holdingPeriod: string;
  marketContext: string;
  marketRegime: string;
  riskMode: string;
  eligibility: OpportunityStrategySignal["eligibility"];
  reasons: string[];
  evidence: string[];
  /** Matched explainability factors (e.g. ADX > 25, EMA alignment). */
  matchedFactors?: string[];
  matchedFactorCount?: number;
  totalFactorCount?: number;
  matchedFrameworks: {
    technical: string[];
    fundamental: string[];
    valuation: string[];
    growth: string[];
  };
  validation: SharedRecommendationValidation;
  longTermRanking: OpportunityLongTermRanking | null;
  timestamp: string;
  source: "StrategyEngine" | "OpportunityEngine";
  /** Read-time Institutional Ranking confidence (0–1 scale). */
  rankingConfidence?: number;
  /** Read-time historical confidence (0–100). */
  historicalConfidence?: number;
  /** Win-rate cohort sample size when win-rate filter is applied. */
  sampleSize?: number;
  winRateSampleSize?: number;
  expectedWinRate?: number;
  /** True when UI may show Expected Win Rate (sample ≥ threshold). */
  showExpectedWinRate?: boolean;
}

function validTradeLevels(signal: OpportunityStrategySignal): boolean {
  if (
    signal.entry <= 0 ||
    signal.stopLoss <= 0 ||
    signal.target <= 0
  ) {
    return false;
  }
  return signal.signal === "SELL"
    ? signal.stopLoss > signal.entry && signal.target < signal.entry
    : signal.stopLoss < signal.entry && signal.target > signal.entry;
}

function signalTargets(signal: OpportunityStrategySignal): number[] {
  return [signal.target1, signal.target2, signal.target];
}

function validateRecommendation(
  candidate: OpportunityCandidate,
  signal: OpportunityStrategySignal,
  consensus: OpportunityStrategyConsensus | undefined
): SharedRecommendationValidation {
  const targets = ensureThreeTargets({
    action: signal.signal === "IGNORE" ? "WATCHLIST" : signal.signal,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    targets: signalTargets(signal),
  });
  const holdingPeriod = resolveDynamicHoldingPeriod(
    candidate,
    signal.holdingPeriod
  );
  const institutional = validateInstitutionalTradeLevels({
    action: signal.signal === "IGNORE" ? "WATCHLIST" : signal.signal,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    targets,
    holdingPeriod,
    primaryStrategy: signal.strategy,
    currentPrice:
      candidate.quote?.price ??
      (typeof candidate.scanMetrics?.cmp === "number"
        ? candidate.scanMetrics.cmp
        : null),
    statedRiskReward: signal.riskReward,
  });

  const checks = {
    tradeLevels: validTradeLevels(signal),
    institutionalTradeLevels: institutional.valid,
    confidence:
      Number.isFinite(candidate.confidencePercent) &&
      candidate.confidencePercent >= 0 &&
      candidate.confidencePercent <= 100,
    opportunityScore:
      typeof candidate.opportunityScore === "number" &&
      candidate.opportunityScore >= 0 &&
      candidate.opportunityScore <= 100,
    agreement:
      !consensus ||
      (consensus.agreementPercent >= 0 &&
        consensus.agreementPercent <= 100 &&
        consensus.conflictPercent >= 0 &&
        consensus.conflictPercent <= 100),
    marketContext: Boolean(signal.marketContext || candidate.marketTrend),
    marketRegime: Boolean(signal.marketRegime || candidate.marketRegime),
    eligibility:
      candidate.pipelineEligible === true &&
      signal.eligibility.eligible === true,
  };
  const reasons = [
    ...Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `Failed recommendation validation: ${check}.`),
    ...institutional.reasons,
  ];
  const uniqueReasons = [...new Set(reasons)];
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    valid: uniqueReasons.length === 0,
    score: Math.round((passed / Object.keys(checks).length) * 100),
    checks,
    reasons: uniqueReasons,
  };
}

function buildExplainabilityMeta(candidate: OpportunityCandidate): {
  matchedFactors: string[];
  matchedFactorCount: number;
  totalFactorCount: number;
  evidence: string[];
} {
  const price =
    candidate.quote?.price ??
    (typeof candidate.scanMetrics?.cmp === "number"
      ? Number(candidate.scanMetrics.cmp)
      : (candidate.entryZone.low + candidate.entryZone.high) / 2);

  const dynamic = constructDynamicTrade({
    price: price > 0 ? price : candidate.entryZone.low || 1,
    side: candidate.side,
    category: candidate.category,
    metrics: candidate.scanMetrics,
    strategyId: candidate.strategyId,
    strategyName: candidate.strategyName,
    strategySignal: candidate.strategySignal,
    supportingStrategyNames:
      candidate.strategyConsensus?.supportingStrategies ?? [],
    conviction: candidate.aiConvictionScore,
    confidence: candidate.confidencePercent,
  });

  const matchedFactors = dynamic.explainability.matchedFactors;
  const supporting = [
    ...(candidate.strategyConsensus?.supportingStrategies ?? []),
    ...dynamic.explainability.supportingFactors,
  ];
  const evidence = [
    ...new Set([
      ...(candidate.strategySignal?.evidence ?? []),
      ...dynamic.explainability.structureAnchors,
      ...dynamic.explainability.notes,
      ...supporting.slice(0, 4),
    ]),
  ].filter(Boolean);

  return {
    matchedFactors,
    matchedFactorCount: matchedFactors.length,
    totalFactorCount: dynamic.explainability.totalFactors,
    evidence,
  };
}

export function buildSharedRecommendation(
  candidate: OpportunityCandidate,
  lastScanTime: string
): SharedRecommendation | null {
  const signal = candidate.strategySignal;
  if (!signal || signal.signal === "IGNORE") return null;

  const consensus = candidate.strategyConsensus;
  const validation = validateRecommendation(candidate, signal, consensus);
  if (!validation.valid) return null;

  const targets = ensureThreeTargets({
    action: signal.signal,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    targets: signalTargets(signal),
  });
  const holdingPeriod = resolveDynamicHoldingPeriod(
    candidate,
    signal.holdingPeriod
  );
  const metrics = computeTradeMetrics(
    signal.signal,
    signal.entry,
    signal.stopLoss,
    targets,
    {
      conviction: consensus?.conviction ?? signal.conviction,
      confidence: consensus?.finalConfidence ?? signal.confidence,
      holdingDaysMid: parseHoldingDaysMid(holdingPeriod),
      currentPrice:
        candidate.quote?.price ??
        (typeof candidate.scanMetrics?.cmp === "number"
          ? candidate.scanMetrics.cmp
          : null),
    }
  );
  if (!metrics || metrics.riskReward <= 1) return null;

  const signals = candidate.strategySignals ?? [signal];
  const explain = buildExplainabilityMeta(candidate);
  return {
    id: candidate.id,
    symbol: candidate.symbol,
    company: candidate.company,
    category: candidate.category,
    action: signal.signal,
    primaryStrategy: signal.strategy,
    primaryStrategyId: signal.strategyId,
    matchedStrategies: signals.map((item) => item.strategy),
    supportingStrategies: consensus?.supportingStrategies ?? [],
    opposingStrategies: consensus?.opposingStrategies ?? [],
    strategyCount: signals.length,
    agreementPercent: round1(consensus?.agreementPercent ?? 100),
    conflictPercent: round1(consensus?.conflictPercent ?? 0),
    opportunityScore: Math.round(candidate.opportunityScore ?? 0),
    frameworkScore: Math.round(
      candidate.frameworkScore ?? candidate.opportunityScore ?? 0
    ),
    confidence: round2(
      consensus?.finalConfidence ?? candidate.confidencePercent
    ),
    conviction: Math.round(
      consensus?.conviction ?? signal.conviction
    ),
    entry: metrics.entry,
    stopLoss: metrics.stopLoss,
    targets: metrics.targets,
    risk: metrics.risk,
    reward: metrics.reward,
    riskReward: round2(metrics.riskReward),
    expectedReturnPercent: metrics.expectedReturnPercent,
    holdingPeriod,
    marketContext: signal.marketContext || candidate.marketTrend || "Unknown",
    marketRegime: signal.marketRegime || candidate.marketRegime || "Unknown",
    riskMode: candidate.riskMode ?? "Neutral",
    eligibility: {
      ...signal.eligibility,
      reasons: [...signal.eligibility.reasons],
    },
    reasons: [...signal.reasons],
    evidence: explain.evidence.length > 0 ? explain.evidence : [...signal.evidence],
    matchedFactors: explain.matchedFactors,
    matchedFactorCount: explain.matchedFactorCount,
    totalFactorCount: explain.totalFactorCount,
    matchedFrameworks: {
      technical: consensus?.technicalFramework ?? [],
      fundamental: consensus?.fundamentalFramework ?? [],
      valuation: consensus?.valuationFramework ?? [],
      growth: consensus?.growthFramework ?? [],
    },
    validation,
    longTermRanking: candidate.longTermRanking ?? null,
    timestamp: lastScanTime,
    source: "StrategyEngine",
  };
}

let cachedKey = "";
let cachedRecommendations: SharedRecommendation[] = [];

/** Pure projection over the persisted scan; never executes strategies. */
export function selectSharedRecommendations(
  state: OpportunityEngineState
): SharedRecommendation[] {
  const key = `v9f1-dyn:${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}`;
  if (key === cachedKey) return cachedRecommendations;

  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  const bySymbol = new Map<string, SharedRecommendation>();
  for (const candidate of Object.values(state.categories).flat()) {
    const recommendation = buildSharedRecommendation(candidate, lastScanTime);
    if (!recommendation) continue;
    const existing = bySymbol.get(recommendation.symbol);
    if (
      !existing ||
      recommendation.opportunityScore > existing.opportunityScore
    ) {
      bySymbol.set(recommendation.symbol, recommendation);
    }
  }

  cachedKey = key;
  cachedRecommendations = [...bySymbol.values()].sort(
    (left, right) =>
      right.opportunityScore - left.opportunityScore ||
      right.confidence - left.confidence
  );
  return cachedRecommendations;
}

/** Shared pipeline snapshot passed into fallback projections. */
export interface SharedMarketSnapshot {
  regime?: string | null;
  marketTrend?: string | null;
  riskMode?: string | null;
  confidence?: number | null;
}

/**
 * Dynamic confidence for fallback recommendations — blends the candidate's
 * own scan confidence with conviction, eligibility, validation, pipeline
 * confidence and risk/reward quality. Weights renormalize over the inputs
 * actually present so missing data never inflates the score.
 */
function computeFallbackConfidence(
  candidate: OpportunityCandidate,
  riskReward: number,
  shared?: SharedMarketSnapshot
): number {
  const inputs: Array<{ value: number; weight: number }> = [];
  const push = (value: number | null | undefined, weight: number) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      inputs.push({ value: Math.min(100, value), weight });
    }
  };

  push(candidate.confidencePercent, 0.3);
  push(candidate.aiConvictionScore, 0.2);
  push(candidate.eligibilityScore, 0.15);
  push(candidate.validationScore, 0.1);
  push(candidate.institutionalScore, 0.05);
  push(shared?.confidence ?? candidate.pipelineConfidence, 0.1);
  push(riskReward > 0 ? Math.min(1, riskReward / 3) * 100 : null, 0.1);

  if (inputs.length === 0) return 0;
  const totalWeight = inputs.reduce((sum, input) => sum + input.weight, 0);
  const blended =
    inputs.reduce((sum, input) => sum + input.value * input.weight, 0) /
    totalWeight;
  return round2(Math.min(95, Math.max(5, blended)));
}

/**
 * Legacy Opportunity Engine projection — recovery fallback used only when the
 * Strategy Engine has no validated signal for a symbol. Still must pass the
 * institutional Recommendation Validator before publication.
 */
export function buildFallbackRecommendation(
  candidate: OpportunityCandidate,
  lastScanTime: string,
  shared?: SharedMarketSnapshot
): SharedRecommendation | null {
  const entryLow = candidate.entryZone?.low ?? 0;
  const entryHigh = candidate.entryZone?.high ?? 0;
  const entry = round2(
    entryLow > 0 && entryHigh > 0
      ? (entryLow + entryHigh) / 2
      : Math.max(entryLow, entryHigh)
  );
  const stopLoss = round2(candidate.stopLoss);
  const target1 = round2(candidate.target1);
  const target2 = round2(candidate.target2 || candidate.target1);
  const target3 = round2(
    candidate.target3 ||
      (candidate.side === "Short"
        ? target2 - Math.max(Math.abs(target1 - target2), Math.abs(entry - stopLoss) * 0.75)
        : target2 + Math.max(Math.abs(target2 - target1), Math.abs(entry - stopLoss) * 0.75))
  );
  if (entry <= 0 || stopLoss <= 0 || target1 <= 0) return null;

  const isShort = candidate.side === "Short";
  const action = isShort ? ("SELL" as const) : ("BUY" as const);
  const targets = ensureThreeTargets({
    action,
    entry,
    stopLoss,
    targets: [target1, target2, target3],
  });

  const primaryStrategy =
    candidate.strategyName ??
    `${CATEGORY_LABELS[candidate.category]} screen`;
  const holdingPeriod = resolveDynamicHoldingPeriod(candidate, null);

  const institutional = validateInstitutionalTradeLevels({
    action,
    entry,
    entryLow: entryLow > 0 ? round2(entryLow) : null,
    entryHigh: entryHigh > 0 ? round2(entryHigh) : null,
    stopLoss,
    targets,
    holdingPeriod,
    primaryStrategy,
    currentPrice:
      candidate.quote?.price ??
      (typeof candidate.scanMetrics?.cmp === "number"
        ? candidate.scanMetrics.cmp
        : null),
    statedRiskReward: candidate.riskReward,
  });
  if (!institutional.valid || !institutional.metrics) return null;

  const metrics = computeTradeMetrics(action, entry, stopLoss, targets, {
    conviction: candidate.aiConvictionScore,
    confidence: candidate.confidencePercent,
    holdingDaysMid: parseHoldingDaysMid(holdingPeriod),
    currentPrice:
      candidate.quote?.price ??
      (typeof candidate.scanMetrics?.cmp === "number"
        ? candidate.scanMetrics.cmp
        : null),
  });
  if (!metrics || metrics.riskReward <= 1) return null;

  const confidence = computeFallbackConfidence(
    candidate,
    metrics.riskReward,
    shared
  );
  const conviction = Math.round(
    Math.min(100, Math.max(0, candidate.aiConvictionScore ?? confidence))
  );
  if (confidence <= 0 && conviction <= 0) return null;

  const opportunityScore = Math.round(
    candidate.opportunityScore ?? Math.max(confidence, conviction)
  );

  const marketRegime =
    candidate.marketRegime || shared?.regime || "Unknown";
  const marketContext =
    candidate.marketTrend || shared?.marketTrend || "Unknown";
  const riskMode = candidate.riskMode ?? shared?.riskMode ?? "Neutral";

  const checks = {
    tradeLevels: true,
    institutionalTradeLevels: institutional.valid,
    confidence: confidence > 0,
    opportunityScore: opportunityScore >= 0 && opportunityScore <= 100,
    agreement: true,
    marketContext: marketContext !== "Unknown",
    marketRegime: marketRegime !== "Unknown",
    eligibility: candidate.pipelineEligible === true,
  };
  const softReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => `Failed recommendation validation: ${check}.`);
  // Soft context/eligibility failures still block publication — institutional
  // grade requires complete, honest validation (never force valid:true).
  const reasons = [...new Set([...softReasons, ...institutional.reasons])];
  if (reasons.length > 0) return null;

  const passed = Object.values(checks).filter(Boolean).length;
  const explain = buildExplainabilityMeta(candidate);

  return {
    id: `fallback:${candidate.id}`,
    symbol: candidate.symbol,
    company: candidate.company,
    category: candidate.category,
    action,
    primaryStrategy,
    primaryStrategyId: candidate.strategyId ?? `screen-${candidate.category}`,
    matchedStrategies: [primaryStrategy],
    supportingStrategies: explain.matchedFactors.slice(0, 5),
    opposingStrategies: [],
    strategyCount: 1,
    agreementPercent: 0,
    conflictPercent: 0,
    opportunityScore,
    frameworkScore: Math.round(
      candidate.frameworkScore ?? opportunityScore
    ),
    confidence,
    conviction,
    entry: metrics.entry,
    stopLoss: metrics.stopLoss,
    targets: metrics.targets,
    risk: metrics.risk,
    reward: metrics.reward,
    riskReward: round2(metrics.riskReward),
    expectedReturnPercent: metrics.expectedReturnPercent,
    holdingPeriod,
    marketContext,
    marketRegime,
    riskMode,
    eligibility: {
      eligible: candidate.pipelineEligible === true,
      score: candidate.eligibilityScore ?? 0,
      reasons: [
        "Legacy Opportunity Engine fallback — Strategy Engine returned no validated signal.",
      ],
    },
    reasons: [candidate.reason, ...(candidate.confidenceReasons ?? [])].filter(
      (reason): reason is string => Boolean(reason)
    ),
    evidence:
      explain.evidence.length > 0
        ? explain.evidence
        : (candidate.bestCallReasons ?? []),
    matchedFactors: explain.matchedFactors,
    matchedFactorCount: explain.matchedFactorCount,
    totalFactorCount: explain.totalFactorCount,
    matchedFrameworks: {
      technical: [],
      fundamental: [],
      valuation: [],
      growth: [],
    },
    validation: {
      valid: true,
      score: Math.round((passed / Object.keys(checks).length) * 100),
      checks,
      reasons: [
        "Fallback recommendation passed institutional Recommendation Validator.",
      ],
    },
    longTermRanking: candidate.longTermRanking ?? null,
    timestamp: lastScanTime,
    source: "OpportunityEngine",
  };
}

/**
 * Read-only accessor for the canonical published recommendation list.
 * Projection and fallback generation are disabled — OE publishes at scan time.
 */
export function selectRecommendationsWithFallback(
  state: OpportunityEngineState,
  _sharedOverride?: SharedMarketSnapshot
): SharedRecommendation[] {
  return readPublishedFromState(state)?.recommendations ?? [];
}
