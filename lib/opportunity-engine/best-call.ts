import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

function clamp(value: number, min: number, max: number): number {
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

function trendStrengthScore(candidate: OpportunityCandidate): number {
  const trend = num(candidate.scanMetrics, "trend_score") ?? 50;
  const adx = num(candidate.scanMetrics, "adx") ?? 0;
  return clamp(trend * 0.6 + Math.min(40, adx * 1.2), 0, 100);
}

function volumeQualityScore(candidate: OpportunityCandidate): number {
  const volumeRatio = num(candidate.scanMetrics, "volume_ratio") ?? 0;
  const delivery = num(candidate.scanMetrics, "delivery_percent") ?? 0;
  if (volumeRatio >= 2.5) return clamp(85 + delivery * 0.15, 0, 100);
  if (volumeRatio >= 1.8) return clamp(70 + delivery * 0.2, 0, 100);
  if (volumeRatio >= 1.3) return clamp(55 + delivery * 0.25, 0, 100);
  return clamp(35 + volumeRatio * 15, 0, 100);
}

function sectorStrengthScore(candidate: OpportunityCandidate): number {
  const rs = num(candidate.scanMetrics, "relative_strength") ?? 50;
  const changePercent = num(candidate.scanMetrics, "change_percent") ?? 0;
  const direction = candidate.side === "Long" ? 1 : -1;
  return clamp(50 + direction * (rs - 50) * 0.7 + direction * changePercent * 2, 0, 100);
}

function fundamentalQualityScore(candidate: OpportunityCandidate): number {
  const score = num(candidate.scanMetrics, "fundamental_score");
  const revenueGrowth = num(candidate.scanMetrics, "revenue_growth") ?? 0;
  if (score !== null) return clamp(score + Math.min(10, revenueGrowth * 0.3), 0, 100);
  return 48;
}

function momentumScore(candidate: OpportunityCandidate): number {
  const momentum = num(candidate.scanMetrics, "momentum") ?? 0;
  const changePercent = num(candidate.scanMetrics, "change_percent") ?? 0;
  const direction = candidate.side === "Long" ? 1 : -1;
  return clamp(50 + direction * (momentum * 8 + changePercent * 3), 0, 100);
}

function downsideRiskScore(candidate: OpportunityCandidate): number {
  const volatility = num(candidate.scanMetrics, "volatility") ?? 0;
  const rsi = num(candidate.scanMetrics, "rsi") ?? 50;
  let risk = 50;
  if (volatility > 50) risk += 25;
  else if (volatility > 40) risk += 15;
  if (candidate.side === "Long" && rsi > 78) risk += 15;
  if (candidate.side === "Short" && rsi < 22) risk += 15;
  if (candidate.riskReward < 1.5) risk += 12;
  return clamp(100 - risk, 0, 100);
}

function penaltyScore(candidate: OpportunityCandidate): number {
  const volatility = num(candidate.scanMetrics, "volatility") ?? 0;
  const rsi = num(candidate.scanMetrics, "rsi") ?? 50;
  let penalty = 0;
  if (volatility > 50) penalty += 12;
  else if (volatility > 40) penalty += 6;
  if (candidate.side === "Long" && rsi > 78) penalty += 10;
  if (candidate.side === "Short" && rsi < 22) penalty += 10;
  if (candidate.riskReward < 1.5) penalty += 8;
  return penalty;
}

export interface BestCallFactors {
  conviction: number;
  riskReward: number;
  trendStrength: number;
  volumeQuality: number;
  sectorStrength: number;
  fundamentalQuality: number;
  momentum: number;
  downsideRisk: number;
  penalty: number;
}

const BEST_CALL_WEIGHTS = {
  conviction: 0.2,
  riskReward: 0.14,
  trendStrength: 0.12,
  volumeQuality: 0.12,
  sectorStrength: 0.1,
  fundamentalQuality: 0.1,
  momentum: 0.1,
  downsideRisk: 0.08,
  penalty: 0.04,
} as const;

export function computeBestCallFactors(candidate: OpportunityCandidate): BestCallFactors {
  const rrScore = clamp(candidate.riskReward * 20, 0, 100);
  return {
    conviction: candidate.aiConvictionScore,
    riskReward: rrScore,
    trendStrength: trendStrengthScore(candidate),
    volumeQuality: volumeQualityScore(candidate),
    sectorStrength: sectorStrengthScore(candidate),
    fundamentalQuality: fundamentalQualityScore(candidate),
    momentum: momentumScore(candidate),
    downsideRisk: downsideRiskScore(candidate),
    penalty: penaltyScore(candidate),
  };
}

export function computeBestCallScore(candidate: OpportunityCandidate): number {
  const factors = computeBestCallFactors(candidate);
  const raw =
    factors.conviction * BEST_CALL_WEIGHTS.conviction +
    factors.riskReward * BEST_CALL_WEIGHTS.riskReward +
    factors.trendStrength * BEST_CALL_WEIGHTS.trendStrength +
    factors.volumeQuality * BEST_CALL_WEIGHTS.volumeQuality +
    factors.sectorStrength * BEST_CALL_WEIGHTS.sectorStrength +
    factors.fundamentalQuality * BEST_CALL_WEIGHTS.fundamentalQuality +
    factors.momentum * BEST_CALL_WEIGHTS.momentum +
    factors.downsideRisk * BEST_CALL_WEIGHTS.downsideRisk -
    factors.penalty * BEST_CALL_WEIGHTS.penalty;

  return Math.round(clamp(raw, 0, 100));
}

export function bestCallStarRating(score: number): string {
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export interface BestCallScoreBreakdown {
  label: string;
  weight: number;
  score: number;
  contribution: number;
}

export function buildBestCallScoreBreakdown(
  candidate: OpportunityCandidate
): BestCallScoreBreakdown[] {
  const factors = computeBestCallFactors(candidate);
  const entries: BestCallScoreBreakdown[] = [
    { label: "AI Conviction", weight: BEST_CALL_WEIGHTS.conviction, score: factors.conviction, contribution: 0 },
    { label: "Risk Reward", weight: BEST_CALL_WEIGHTS.riskReward, score: factors.riskReward, contribution: 0 },
    { label: "Trend Confirmation", weight: BEST_CALL_WEIGHTS.trendStrength, score: factors.trendStrength, contribution: 0 },
    { label: "Volume Quality", weight: BEST_CALL_WEIGHTS.volumeQuality, score: factors.volumeQuality, contribution: 0 },
    { label: "Sector Strength", weight: BEST_CALL_WEIGHTS.sectorStrength, score: factors.sectorStrength, contribution: 0 },
    { label: "Fundamentals", weight: BEST_CALL_WEIGHTS.fundamentalQuality, score: factors.fundamentalQuality, contribution: 0 },
    { label: "Momentum", weight: BEST_CALL_WEIGHTS.momentum, score: factors.momentum, contribution: 0 },
    { label: "Low Downside Risk", weight: BEST_CALL_WEIGHTS.downsideRisk, score: factors.downsideRisk, contribution: 0 },
  ];

  for (const entry of entries) {
    entry.contribution = Math.round(entry.score * entry.weight);
  }

  if (factors.penalty > 0) {
    entries.push({
      label: "Penalty",
      weight: BEST_CALL_WEIGHTS.penalty,
      score: factors.penalty,
      contribution: -Math.round(factors.penalty * BEST_CALL_WEIGHTS.penalty),
    });
  }

  return entries;
}

export function buildBestCallReasons(
  candidate: OpportunityCandidate,
  allScores: { candidate: OpportunityCandidate; score: number }[]
): string[] {
  const reasons: string[] = [];
  const metrics = candidate.scanMetrics;
  const factors = computeBestCallFactors(candidate);

  const topScore = [...allScores].sort((a, b) => b.score - a.score)[0];
  if (topScore?.candidate.symbol === candidate.symbol) {
    reasons.push("Highest probability setup");
  }

  const topConviction = [...allScores].sort(
    (a, b) => b.candidate.aiConvictionScore - a.candidate.aiConvictionScore
  )[0];
  if (topConviction?.candidate.symbol === candidate.symbol) {
    reasons.push("Highest institutional quality");
  }

  const topRr = [...allScores].sort(
    (a, b) => b.candidate.riskReward - a.candidate.riskReward
  )[0];
  if (topRr?.candidate.symbol === candidate.symbol && candidate.riskReward >= 2) {
    reasons.push(`Highest expected reward (1:${candidate.riskReward.toFixed(1)})`);
  } else if (candidate.riskReward >= 2.5) {
    reasons.push(`Favorable R:R 1:${candidate.riskReward.toFixed(1)}`);
  }

  const adx = num(metrics, "adx") ?? 0;
  if (adx >= 28 && factors.trendStrength >= 65) {
    reasons.push("Strong trend confirmation");
  }

  if (factors.sectorStrength >= 70) {
    reasons.push("Strong sector leadership");
  } else if (factors.sectorStrength >= 58) {
    reasons.push("Sector outperformer");
  }

  const delivery = num(metrics, "delivery_percent") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  if (delivery >= 35 && volumeRatio >= 1.3) {
    reasons.push("High liquidity & institutional participation");
  } else if (volumeRatio >= 2) {
    reasons.push("High liquidity");
  }

  if (factors.downsideRisk >= 70) {
    reasons.push("Low downside risk");
  }

  const priceToHigh = num(metrics, "price_to_52w_high") ?? 0;
  if (candidate.category === "breakout" || priceToHigh >= 92) {
    reasons.push("Breakout confirmed");
  }

  if (factors.fundamentalQuality >= 65) {
    reasons.push("Strong fundamental quality");
  }

  if (reasons.length === 0 && candidate.aiConvictionScore >= 75) {
    reasons.push(`High conviction (${candidate.aiConvictionScore})`);
  }

  return reasons.slice(0, 6);
}
