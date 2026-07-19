/**
 * Long-term / Swing ranking factors for Strategy Engine outputs.
 */

import type { StrategyConsensusResult } from "@/lib/opportunity-engine/strategy-consensus";
import type {
  OpportunityCandidate,
  OpportunityStrategySignal,
} from "@/lib/opportunity-engine/types";

export interface LongTermRankingFactors {
  technicalQuality: number;
  fundamentalQuality: number;
  valuation: number;
  growth: number;
  capitalAllocation: number;
  momentum: number;
  institutionalOwnership: number;
  sectorStrength: number;
  marketContext: number;
  marketRegime: number;
  aiConfidence: number;
  risk: number;
  reward: number;
  frameworkScore: number;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function metric(
  candidate: OpportunityCandidate,
  key: string,
  fallback = 0
): number {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function computeLongTermRankingFactors(
  candidate: OpportunityCandidate,
  primary: OpportunityStrategySignal | null,
  consensus: StrategyConsensusResult | null
): LongTermRankingFactors {
  const technicalQuality = clamp(
    (primary?.confidence ?? candidate.confidencePercent) * 0.6 +
      metric(candidate, "trend_score", 50) * 0.4
  );
  const fundamentalQuality = clamp(
    metric(candidate, "fundamental_score", 50) * 0.7 +
      metric(candidate, "roe", 12) * 1.5
  );
  const pe = metric(candidate, "pe", 25);
  const valuation = clamp(pe > 0 ? 100 - Math.min(pe * 1.8, 70) : 50);
  const growth = clamp(50 + metric(candidate, "revenue_growth", 0) * 1.5);
  const capitalAllocation = clamp(
    fundamentalQuality * 0.5 + (100 - Math.min(metric(candidate, "volatility", 30), 60))
  );
  const momentum = clamp(
    metric(candidate, "momentum", 0) * 2 +
      metric(candidate, "relative_strength", 50) * 0.6
  );
  const institutionalOwnership = clamp(
    metric(candidate, "delivery_percent", 40) * 1.2 +
      (candidate.institutionalScore ?? 50) * 0.4
  );
  const sectorStrength = clamp(metric(candidate, "sector_strength", 55));
  const marketContext = clamp(
    (candidate.pipelineConfidence ?? 50) * 0.5 +
      (candidate.opportunityScore ?? 50) * 0.5
  );
  const marketRegime = clamp(candidate.pipelineConfidence ?? 55);
  const aiConfidence = clamp(candidate.aiConvictionScore);
  const risk = clamp(
    primary
      ? Math.min(100, (primary.risk / Math.max(primary.entry, 1)) * 1000)
      : candidate.riskReward > 0
        ? 100 / candidate.riskReward
        : 50
  );
  const reward = clamp(
    primary
      ? Math.min(100, primary.riskReward * 28)
      : candidate.riskReward * 28
  );

  const frameworkScore = clamp(
    technicalQuality * 0.18 +
      fundamentalQuality * 0.16 +
      valuation * 0.1 +
      growth * 0.1 +
      capitalAllocation * 0.06 +
      momentum * 0.08 +
      institutionalOwnership * 0.06 +
      sectorStrength * 0.05 +
      marketContext * 0.07 +
      marketRegime * 0.05 +
      aiConfidence * 0.05 +
      reward * 0.06 -
      risk * 0.02 +
      (consensus?.agreementScore ?? 50) * 0.08
  );

  return {
    technicalQuality,
    fundamentalQuality,
    valuation,
    growth,
    capitalAllocation,
    momentum,
    institutionalOwnership,
    sectorStrength,
    marketContext,
    marketRegime,
    aiConfidence,
    risk,
    reward,
    frameworkScore,
  };
}
