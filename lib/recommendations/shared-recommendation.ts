import type {
  OpportunityCandidate,
  OpportunityEngineState,
  OpportunityLongTermRanking,
  OpportunityStrategyConsensus,
  OpportunityStrategySignal,
} from "@/lib/opportunity-engine/types";

export type RecommendationAction =
  | "BUY"
  | "SELL"
  | "WATCHLIST";

export interface SharedRecommendationValidation {
  valid: boolean;
  score: number;
  checks: {
    tradeLevels: boolean;
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
  holdingPeriod: string;
  marketContext: string;
  marketRegime: string;
  riskMode: string;
  eligibility: OpportunityStrategySignal["eligibility"];
  reasons: string[];
  evidence: string[];
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

function validateRecommendation(
  candidate: OpportunityCandidate,
  signal: OpportunityStrategySignal,
  consensus: OpportunityStrategyConsensus | undefined
): SharedRecommendationValidation {
  const checks = {
    tradeLevels: validTradeLevels(signal),
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
  const reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => `Failed recommendation validation: ${check}.`);
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    valid: reasons.length === 0,
    score: Math.round((passed / Object.keys(checks).length) * 100),
    checks,
    reasons,
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

  const signals = candidate.strategySignals ?? [signal];
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
    agreementPercent: consensus?.agreementPercent ?? 100,
    conflictPercent: consensus?.conflictPercent ?? 0,
    opportunityScore: Math.round(candidate.opportunityScore ?? 0),
    frameworkScore: Math.round(
      candidate.frameworkScore ?? candidate.opportunityScore ?? 0
    ),
    confidence: Math.round(
      consensus?.finalConfidence ?? candidate.confidencePercent
    ),
    conviction: Math.round(
      consensus?.conviction ?? signal.conviction
    ),
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    targets: [signal.target1, signal.target2, signal.target].filter(
      (target, index, list) => target > 0 && list.indexOf(target) === index
    ),
    risk: signal.risk,
    reward: signal.reward,
    riskReward: signal.riskReward,
    holdingPeriod: signal.holdingPeriod,
    marketContext: signal.marketContext || candidate.marketTrend || "Unknown",
    marketRegime: signal.marketRegime || candidate.marketRegime || "Unknown",
    riskMode: candidate.riskMode ?? "Neutral",
    eligibility: {
      ...signal.eligibility,
      reasons: [...signal.eligibility.reasons],
    },
    reasons: [...signal.reasons],
    evidence: [...signal.evidence],
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
  const key = `${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}`;
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

/**
 * Legacy Opportunity Engine projection — recovery fallback used only when the
 * Strategy Engine has no validated signal for a symbol. Builds the shared
 * recommendation from the candidate's own ranked levels (entry zone, stop,
 * targets, conviction) exactly as the pre-11B surfaces displayed them.
 */
export function buildFallbackRecommendation(
  candidate: OpportunityCandidate,
  lastScanTime: string
): SharedRecommendation | null {
  const entryLow = candidate.entryZone?.low ?? 0;
  const entryHigh = candidate.entryZone?.high ?? 0;
  const entry =
    entryLow > 0 && entryHigh > 0
      ? (entryLow + entryHigh) / 2
      : Math.max(entryLow, entryHigh);
  const stopLoss = candidate.stopLoss;
  const target1 = candidate.target1;
  const target2 = candidate.target2 || target1;
  if (entry <= 0 || stopLoss <= 0 || target1 <= 0) return null;

  const isShort = candidate.side === "Short";
  const levelsValid = isShort
    ? stopLoss > entry && target1 < entry
    : stopLoss < entry && target1 > entry;
  if (!levelsValid) return null;

  const confidence = Math.round(
    Math.min(100, Math.max(0, candidate.confidencePercent ?? 0))
  );
  const conviction = Math.round(
    Math.min(100, Math.max(0, candidate.aiConvictionScore ?? confidence))
  );
  if (confidence <= 0 && conviction <= 0) return null;

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(target2 - entry);
  const opportunityScore = Math.round(
    candidate.opportunityScore ?? Math.max(confidence, conviction)
  );

  const checks = {
    tradeLevels: true,
    confidence: true,
    opportunityScore: opportunityScore >= 0 && opportunityScore <= 100,
    agreement: true,
    marketContext: Boolean(candidate.marketTrend),
    marketRegime: Boolean(candidate.marketRegime),
    eligibility: candidate.pipelineEligible === true,
  };
  const passed = Object.values(checks).filter(Boolean).length;

  return {
    id: `fallback:${candidate.id}`,
    symbol: candidate.symbol,
    company: candidate.company,
    category: candidate.category,
    action: isShort ? "SELL" : "BUY",
    primaryStrategy:
      candidate.strategyName ?? "Opportunity Engine ranking",
    primaryStrategyId: candidate.strategyId ?? "opportunity-engine",
    matchedStrategies: candidate.strategyName ? [candidate.strategyName] : [],
    supportingStrategies: [],
    opposingStrategies: [],
    strategyCount: candidate.strategyName ? 1 : 0,
    agreementPercent: 100,
    conflictPercent: 0,
    opportunityScore,
    frameworkScore: Math.round(
      candidate.frameworkScore ?? opportunityScore
    ),
    confidence,
    conviction,
    entry,
    stopLoss,
    targets: [target1, target2].filter(
      (target, index, list) => target > 0 && list.indexOf(target) === index
    ),
    risk,
    reward,
    riskReward:
      candidate.riskReward > 0
        ? candidate.riskReward
        : risk > 0
          ? Number((reward / risk).toFixed(2))
          : 0,
    holdingPeriod: candidate.timeHorizon ?? "—",
    marketContext: candidate.marketTrend ?? "Unknown",
    marketRegime: candidate.marketRegime ?? "Unknown",
    riskMode: candidate.riskMode ?? "Neutral",
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
    evidence: candidate.bestCallReasons ?? [],
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
        "Fallback recommendation from legacy Opportunity Engine ranking.",
      ],
    },
    longTermRanking: candidate.longTermRanking ?? null,
    timestamp: lastScanTime,
    source: "OpportunityEngine",
  };
}

let cachedFallbackKey = "";
let cachedFallbackRecommendations: SharedRecommendation[] = [];

/**
 * Strategy Engine first, legacy Opportunity Engine second. A symbol only uses
 * the fallback when the Strategy Engine produced nothing validated for it, so
 * surfaces never go empty solely because of the 11B migration.
 */
export function selectRecommendationsWithFallback(
  state: OpportunityEngineState
): SharedRecommendation[] {
  const key = `${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}`;
  if (key === cachedFallbackKey) return cachedFallbackRecommendations;

  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  const strict = selectSharedRecommendations(state);
  const strictSymbols = new Set(
    strict.map((recommendation) => recommendation.symbol.toUpperCase())
  );

  const fallbackBySymbol = new Map<string, SharedRecommendation>();
  for (const candidate of Object.values(state.categories).flat()) {
    const symbol = candidate.symbol.toUpperCase();
    if (strictSymbols.has(symbol)) continue;
    const fallback = buildFallbackRecommendation(candidate, lastScanTime);
    if (!fallback) continue;
    const existing = fallbackBySymbol.get(symbol);
    if (!existing || fallback.opportunityScore > existing.opportunityScore) {
      fallbackBySymbol.set(symbol, fallback);
    }
  }

  cachedFallbackKey = key;
  cachedFallbackRecommendations = [...strict, ...fallbackBySymbol.values()].sort(
    (left, right) =>
      right.opportunityScore - left.opportunityScore ||
      right.confidence - left.confidence
  );
  return cachedFallbackRecommendations;
}
