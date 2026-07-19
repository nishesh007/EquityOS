/**
 * Pipeline enrichment for Opportunity Engine — Sprint 11B Prompt 3.
 * Every candidate is scored against Trading Pipeline output
 * (Context → Regime → Eligibility). No duplicate eligibility logic.
 */

import type { OpportunityCandidate, OpportunityCategory } from "@/lib/opportunity-engine/types";
import {
  computeOpportunityScore,
  type OpportunityScoreWeights,
} from "@/lib/opportunity-engine/opportunity-score";
import type { EligibleStrategy, StrategyId } from "@/src/modules/strategyEligibility";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";

/** Map opportunity categories onto registered strategy IDs (best-fit first). */
export const CATEGORY_STRATEGY_IDS: Record<OpportunityCategory, StrategyId[]> = {
  intraday: ["orb", "gap-and-go", "scalping", "opening-range-fade"],
  swing: [
    "ema-pullback",
    "vcp",
    "stage-analysis",
    "darvas",
    "relative-strength-leadership",
    "cup-and-handle",
    "flat-base",
    "fifty-two-week-high",
    "earnings-momentum",
  ],
  breakout: [
    "vcp",
    "cup-and-handle",
    "flat-base",
    "fifty-two-week-high",
    "darvas",
    "breakout-retest",
  ],
  momentum: [
    "relative-strength-leadership",
    "ema-pullback",
    "earnings-momentum",
    "stage-analysis",
    "momentum-continuation",
  ],
  relative_volume: ["institutional-accumulation", "vwap-continuation"],
  mean_reversion: ["vwap-mean-reversion", "liquidity-sweep"],
  ai_high_conviction: [
    "quality-compounder",
    "buffett",
    "graham",
    "lynch",
    "greenblatt",
  ],
};

export interface PipelineGateThresholds {
  readonly minLiquidityVolumeRatio: number;
  readonly minTrendScore: number;
  readonly minRiskReward: number;
  readonly minCandidateConfidence: number;
  readonly minPipelineConfidence: number;
  readonly minEligibilityScore: number;
  readonly minOpportunityScore: number;
}

export const DEFAULT_PIPELINE_GATE_THRESHOLDS: PipelineGateThresholds = {
  minLiquidityVolumeRatio: 1.0,
  minTrendScore: 40,
  minRiskReward: 1.5,
  minCandidateConfidence: 45,
  minPipelineConfidence: 45,
  minEligibilityScore: 55,
  minOpportunityScore: 50,
};

export interface PipelineEnrichmentOptions {
  weights?: Partial<OpportunityScoreWeights> | null;
  thresholds?: Partial<PipelineGateThresholds> | null;
  /** When true, rejected candidates are dropped from the list. Default true. */
  dropRejected?: boolean;
}

export interface PipelineScanSummary {
  regime: string;
  marketTrend: string;
  riskMode: string;
  confidence: number;
  confidenceGrade: string;
  pipelineHealth: number;
  healthGrade: string;
  eligibleStrategyCount: number;
  rejectedStrategyCount: number;
  timestamp: string;
  eligibleStrategies: Array<{
    strategyId: string;
    name: string;
    category: string;
    score: number;
    reasons: string[];
  }>;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function num(
  metrics: Record<string, number | string | null> | undefined,
  key: string
): number | null {
  if (!metrics) return null;
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveThresholds(
  overrides?: Partial<PipelineGateThresholds> | null
): PipelineGateThresholds {
  return { ...DEFAULT_PIPELINE_GATE_THRESHOLDS, ...(overrides ?? {}) };
}

/**
 * Pick the best EligibleStrategy for a category from the pipeline matrix.
 */
export function resolveCategoryStrategy(
  category: OpportunityCategory,
  strategies: readonly EligibleStrategy[]
): EligibleStrategy | null {
  const preferred = CATEGORY_STRATEGY_IDS[category] ?? [];
  const byId = new Map(strategies.map((s) => [s.strategyId, s]));

  for (const id of preferred) {
    const hit = byId.get(id);
    if (hit) return hit;
  }

  // Fall back to highest-scoring eligible strategy in a compatible category band.
  const eligible = strategies.filter((s) => s.eligible);
  if (eligible.length === 0) {
    // Still return best preferred profile even if rejected (for reasons).
    for (const id of preferred) {
      const hit = byId.get(id);
      if (hit) return hit;
    }
    return strategies.slice().sort((a, b) => b.score - a.score)[0] ?? null;
  }

  for (const id of preferred) {
    const hit = eligible.find((s) => s.strategyId === id);
    if (hit) return hit;
  }

  return eligible.slice().sort((a, b) => b.score - a.score || b.priority - a.priority)[0] ?? null;
}

function deriveValidationScore(candidate: OpportunityCandidate): number {
  const metrics = candidate.scanMetrics;
  const hasTech = metrics?.has_live_technicals === 1 ? 20 : 0;
  const hasFund = metrics?.has_live_fundamentals === 1 ? 15 : 0;
  const adx = num(metrics, "adx") ?? 0;
  const delivery = num(metrics, "delivery_percent") ?? 0;
  return clamp(
    45 + hasTech + hasFund + Math.min(12, adx * 0.25) + Math.min(8, delivery * 0.1)
  );
}

function deriveRiskQuality(candidate: OpportunityCandidate, riskMode: string): number {
  const rr = candidate.riskReward;
  const vol = num(candidate.scanMetrics, "volatility") ?? 30;
  let score = clamp(rr * 28);
  if (vol > 45) score -= 12;
  else if (vol < 25) score += 6;
  if (riskMode === "Risk Off") score -= 10;
  if (riskMode === "Risk On") score += 4;
  return clamp(score);
}

function collectGateRejections(
  candidate: OpportunityCandidate,
  strategy: EligibleStrategy | null,
  pipeline: TradingPipelineResult,
  thresholds: PipelineGateThresholds
): string[] {
  const rejected: string[] = [];
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 0;
  const trendScore = num(candidate.scanMetrics, "trend_score") ?? 50;
  const liquidity = candidate.convictionComponents?.liquidity ?? 50;

  if (volumeRatio < thresholds.minLiquidityVolumeRatio || liquidity < 40) {
    rejected.push("Low liquidity");
  }
  if (trendScore < thresholds.minTrendScore) {
    rejected.push("Weak trend");
  }
  if (candidate.riskReward < thresholds.minRiskReward) {
    rejected.push("Poor RR");
  }
  if (candidate.confidencePercent < thresholds.minCandidateConfidence) {
    rejected.push("Poor confidence");
  }
  if (pipeline.pipelineConfidence < thresholds.minPipelineConfidence) {
    rejected.push("Pipeline confidence below threshold");
  }
  if (!strategy || !strategy.eligible) {
    rejected.push("Wrong market regime");
  } else if (strategy.score < thresholds.minEligibilityScore) {
    rejected.push("Eligibility score below threshold");
  }
  if (pipeline.context.riskMode === "Risk Off" && candidate.side === "Long") {
    const strength = pipeline.context.marketStrength;
    if (strength < 45) rejected.push("High risk");
  }
  if ((strategy?.blockedReasons?.length ?? 0) > 0 && !strategy?.eligible) {
    for (const reason of strategy!.blockedReasons.slice(0, 2)) {
      if (!rejected.includes(reason)) rejected.push(reason);
    }
  }

  return rejected;
}

/**
 * Enrich a single candidate with Trading Pipeline context / eligibility / score.
 */
export function enrichCandidateWithPipeline(
  candidate: OpportunityCandidate,
  pipeline: TradingPipelineResult,
  options: PipelineEnrichmentOptions = {}
): OpportunityCandidate {
  const thresholds = resolveThresholds(options.thresholds);
  const strategy = resolveCategoryStrategy(
    candidate.category,
    pipeline.eligibleStrategies
  );
  const rejectedReasons = collectGateRejections(
    candidate,
    strategy,
    pipeline,
    thresholds
  );
  const eligible = rejectedReasons.length === 0 && Boolean(strategy?.eligible);

  const eligibilityScore = strategy?.score ?? 0;
  const contextScore = clamp(pipeline.context.marketStrength);
  const regimeScore = clamp(pipeline.confidence.score);
  const validationScore = deriveValidationScore(candidate);
  const riskScore = deriveRiskQuality(candidate, pipeline.context.riskMode);
  const institutionalScore = clamp(pipeline.pipelineHealth);
  const aiConviction = clamp(candidate.aiConvictionScore);

  const scored = computeOpportunityScore(
    {
      strategy: eligibilityScore,
      context: contextScore,
      regime: regimeScore,
      validation: validationScore,
      risk: riskScore,
      institutional: institutionalScore,
      aiConviction,
    },
    options.weights
  );

  if (eligible && scored.score < thresholds.minOpportunityScore) {
    rejectedReasons.push("Opportunity score below threshold");
  }

  const finalEligible = eligible && rejectedReasons.length === 0;
  const eligibleReasons = [
    ...(strategy?.reasons ?? []).slice(0, 3),
    `Regime ${pipeline.regime.regime}`,
    `Context ${pipeline.context.marketTrend}`,
  ];

  // Prefer opportunity score for ranking; keep conviction for display.
  return {
    ...candidate,
    pipelineEligible: finalEligible,
    eligibilityScore: Math.round(eligibilityScore),
    opportunityScore: scored.score,
    institutionalScore: Math.round(institutionalScore),
    validationScore: Math.round(validationScore),
    marketRegime: pipeline.regime.regime,
    marketTrend: pipeline.context.marketTrend,
    riskMode: pipeline.context.riskMode,
    pipelineConfidence: Math.round(pipeline.pipelineConfidence),
    strategyId: strategy?.strategyId,
    strategyName: strategy?.name,
    eligibleReasons: finalEligible ? eligibleReasons : [],
    rejectedReasons: finalEligible ? [] : rejectedReasons,
    // Update conviction marketRegime component from live pipeline when present
    convictionComponents: candidate.convictionComponents
      ? {
          ...candidate.convictionComponents,
          marketRegime: regimeScore,
        }
      : candidate.convictionComponents,
  };
}

/**
 * Enrich and optionally filter a category list; re-rank by opportunityScore.
 */
export function enrichCandidatesWithPipeline(
  candidates: OpportunityCandidate[],
  pipeline: TradingPipelineResult,
  options: PipelineEnrichmentOptions = {}
): OpportunityCandidate[] {
  const dropRejected = options.dropRejected !== false;
  const enriched = candidates.map((c) =>
    enrichCandidateWithPipeline(c, pipeline, options)
  );
  const kept = dropRejected
    ? enriched.filter((c) => c.pipelineEligible !== false)
    : enriched;

  return kept
    .slice()
    .sort(
      (a, b) =>
        (b.opportunityScore ?? b.aiConvictionScore) -
        (a.opportunityScore ?? a.aiConvictionScore)
    )
    .map((candidate, index) => ({
      ...candidate,
      previousRank: candidate.rank,
      rank: index + 1,
    }));
}

export function buildPipelineScanSummary(
  pipeline: TradingPipelineResult
): PipelineScanSummary {
  const eligible = pipeline.eligibleStrategies.filter((s) => s.eligible);
  const rejected = pipeline.eligibleStrategies.filter((s) => !s.eligible);
  return {
    regime: pipeline.regime.regime,
    marketTrend: pipeline.context.marketTrend,
    riskMode: pipeline.context.riskMode,
    confidence: Math.round(pipeline.pipelineConfidence),
    confidenceGrade: pipeline.confidence.grade,
    pipelineHealth: Math.round(pipeline.pipelineHealth),
    healthGrade: pipeline.healthGrade,
    eligibleStrategyCount: eligible.length,
    rejectedStrategyCount: rejected.length,
    timestamp:
      pipeline.timestamp instanceof Date
        ? pipeline.timestamp.toISOString()
        : String(pipeline.timestamp),
    eligibleStrategies: eligible.slice(0, 12).map((s) => ({
      strategyId: s.strategyId,
      name: s.name,
      category: s.category,
      score: Math.round(s.score),
      reasons: s.reasons.slice(0, 3),
    })),
  };
}
