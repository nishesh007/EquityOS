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
  penalty: number;
}

const BEST_CALL_WEIGHTS = {
  conviction: 0.22,
  riskReward: 0.14,
  trendStrength: 0.12,
  volumeQuality: 0.12,
  sectorStrength: 0.1,
  fundamentalQuality: 0.1,
  momentum: 0.12,
  penalty: 0.08,
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
    factors.momentum * BEST_CALL_WEIGHTS.momentum -
    factors.penalty * BEST_CALL_WEIGHTS.penalty;

  return Math.round(clamp(raw, 0, 100));
}

export function bestCallStarRating(score: number): string {
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function buildBestCallReasons(
  candidate: OpportunityCandidate,
  allScores: { candidate: OpportunityCandidate; score: number }[]
): string[] {
  const reasons: string[] = [];
  const metrics = candidate.scanMetrics;
  const factors = computeBestCallFactors(candidate);

  const topConviction = [...allScores].sort(
    (a, b) => b.candidate.aiConvictionScore - a.candidate.aiConvictionScore
  )[0];
  if (topConviction?.candidate.symbol === candidate.symbol) {
    reasons.push("Highest conviction today");
  } else if (candidate.aiConvictionScore >= 80) {
    reasons.push(`High conviction (${candidate.aiConvictionScore})`);
  }

  if (candidate.riskReward >= 3) {
    reasons.push(`Risk Reward 1:${candidate.riskReward.toFixed(1)}`);
  } else if (candidate.riskReward >= 2) {
    reasons.push(`Favorable R:R 1:${candidate.riskReward.toFixed(1)}`);
  }

  const delivery = num(metrics, "delivery_percent") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const priceToHigh =
    num(metrics, "price_to_52w_high") ?? 0;
  if (delivery >= 35 && volumeRatio >= 1.3) {
    reasons.push("Strong institutional participation");
  } else if (volumeRatio >= 2) {
    reasons.push("Elevated institutional volume");
  }

  if (factors.sectorStrength >= 70) {
    reasons.push("Sector leader");
  } else if (factors.sectorStrength >= 58) {
    reasons.push("Sector outperformer");
  }

  const price = num(metrics, "cmp");
  const ema20 = num(metrics, "ema20");
  const ema200 = num(metrics, "ema200");
  if (
    candidate.side === "Long" &&
    price !== null &&
    ema20 !== null &&
    ema200 !== null &&
    price > ema20 &&
    price > ema200
  ) {
    reasons.push("Above key moving averages");
  }

  if (
    candidate.category === "breakout" ||
    priceToHigh >= 92
  ) {
    reasons.push("Breakout confirmed");
  }

  const adx = num(metrics, "adx") ?? 0;
  if (adx >= 28 && factors.momentum >= 65) {
    reasons.push("Momentum trend intact");
  }

  if (factors.fundamentalQuality >= 65) {
    reasons.push("Strong fundamental quality");
  }

  return reasons.slice(0, 6);
}
