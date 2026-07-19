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
  lastScanTime: string;
  source: "StrategyEngine";
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
    lastScanTime,
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
