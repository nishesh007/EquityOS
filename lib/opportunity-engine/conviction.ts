import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function num(metrics: Record<string, number | string | null>, key: string): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface ConvictionComponents {
  technical: number;
  momentum: number;
  trend: number;
  volume: number;
  fundamentals: number;
  liquidity: number;
  marketRegime: number;
  rewardRisk: number;
}

const CONVICTION_WEIGHTS: Record<keyof ConvictionComponents, number> = {
  technical: 0.16,
  momentum: 0.14,
  trend: 0.14,
  volume: 0.14,
  fundamentals: 0.1,
  liquidity: 0.1,
  marketRegime: 0.12,
  rewardRisk: 0.1,
};

/**
 * Derives explainable conviction components from live metrics.
 */
export function computeConvictionComponents(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward = 2
): ConvictionComponents {
  const changePercent = num(metrics, "change_percent") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const rsi = num(metrics, "rsi");
  const adx = num(metrics, "adx") ?? 0;
  const momentum = num(metrics, "momentum") ?? 0;
  const trendScore = num(metrics, "trend_score") ?? 50;
  const relativeStrength = num(metrics, "relative_strength") ?? 50;
  const fundamentalScore = num(metrics, "fundamental_score");
  const deliveryPercent = num(metrics, "delivery_percent") ?? 0;
  const volatility = num(metrics, "volatility") ?? 0;
  const week52Momentum = num(metrics, "week52_momentum") ?? 0;

  const direction = side === "Long" ? 1 : -1;

  let technical = 50;
  if (rsi !== null) {
    if (side === "Long" && rsi >= 45 && rsi <= 70) technical += 15;
    if (side === "Short" && rsi >= 30 && rsi <= 55) technical += 15;
    if (side === "Long" && rsi <= 35) technical += 10;
    if (side === "Short" && rsi >= 65) technical += 10;
  }
  technical += Math.min(20, adx * 0.5);
  technical = clamp(technical, 0, 100);

  const momentumAligned = direction * (momentum + changePercent * 0.5 + week52Momentum * 0.2);
  const momentumScore = clamp(50 + momentumAligned * 4, 0, 100);

  const trend = clamp(50 + direction * (trendScore - 50) * 0.9, 0, 100);

  let volume = 40;
  if (volumeRatio >= 2) volume = 90;
  else if (volumeRatio >= 1.5) volume = 78;
  else if (volumeRatio >= 1.2) volume = 65;
  else if (volumeRatio >= 1) volume = 52;

  const fundamentals =
    fundamentalScore !== null ? clamp(fundamentalScore, 0, 100) : 48;

  const liquidity = clamp(
    45 + volumeRatio * 15 + deliveryPercent * 0.35,
    0,
    100
  );

  let marketRegime = 52;
  marketRegime += direction * (relativeStrength - 50) * 0.35;
  if (volatility > 45) marketRegime -= 8;
  else if (volatility < 25) marketRegime += 4;
  marketRegime = clamp(marketRegime, 0, 100);

  const rewardRisk = clamp(riskReward * 28, 0, 100);

  if (category === "intraday") {
    return {
      technical: clamp(technical + Math.abs(changePercent) * 2, 0, 100),
      momentum: momentumScore,
      trend,
      volume: clamp(volume + 5, 0, 100),
      fundamentals,
      liquidity,
      marketRegime,
      rewardRisk,
    };
  }

  if (category === "mean_reversion") {
    return {
      technical: clamp(technical + 8, 0, 100),
      momentum: momentumScore,
      trend,
      volume,
      fundamentals,
      liquidity,
      marketRegime,
      rewardRisk,
    };
  }

  return {
    technical,
    momentum: momentumScore,
    trend,
    volume,
    fundamentals,
    liquidity,
    marketRegime,
    rewardRisk,
  };
}

function weightedConviction(components: ConvictionComponents): number {
  let total = 0;
  for (const key of Object.keys(CONVICTION_WEIGHTS) as (keyof ConvictionComponents)[]) {
    total += components[key] * CONVICTION_WEIGHTS[key];
  }
  return total;
}

/**
 * AI conviction derived from weighted live-market components.
 */
export function computeLiveAiConviction(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward = 2
): number {
  const components = computeConvictionComponents(metrics, category, side, riskReward);
  const raw = weightedConviction(components);
  return Math.round(clamp(raw, 40, 97));
}

export function computeLiveConfidence(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory
): number {
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const adx = num(metrics, "adx") ?? 0;
  const deliveryPercent = num(metrics, "delivery_percent") ?? 0;
  const hasTechnicals = metrics.has_live_technicals === 1;
  const hasFundamentals = metrics.has_live_fundamentals === 1;

  let confidence = 55;
  if (hasTechnicals) confidence += 12;
  if (hasFundamentals) confidence += 8;
  confidence += Math.min(15, volumeRatio * 4);
  confidence += Math.min(8, adx * 0.15);
  confidence += Math.min(6, deliveryPercent * 0.08);

  if (category === "swing" && hasFundamentals) confidence += 5;
  if (category === "ai_high_conviction" && hasTechnicals && hasFundamentals) confidence += 6;

  return Math.round(clamp(confidence, 45, 95));
}
