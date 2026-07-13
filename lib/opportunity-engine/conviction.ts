import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function num(metrics: Record<string, number | string | null>, key: string): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * AI conviction derived entirely from live market metrics — no seeded inputs.
 */
export function computeLiveAiConviction(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short"
): number {
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
  const momentumAligned =
    direction * (momentum + changePercent * 0.5 + week52Momentum * 0.2);
  const trendAligned = direction * (trendScore - 50) * 0.4;
  const volumeBoost = volumeRatio > 1.5 ? Math.min(12, (volumeRatio - 1) * 6) : 0;
  const adxBoost = adx > 20 ? Math.min(8, (adx - 20) * 0.3) : 0;
  const rsBoost = direction * (relativeStrength - 50) * 0.15;
  const deliveryBoost = deliveryPercent > 40 ? 4 : deliveryPercent > 25 ? 2 : 0;
  const fundamentalBoost =
    fundamentalScore !== null ? (fundamentalScore - 50) * 0.2 : 0;

  let rsiBoost = 0;
  if (rsi !== null) {
    if (side === "Long" && rsi <= 35) rsiBoost = 6;
    if (side === "Short" && rsi >= 65) rsiBoost = 6;
    if (side === "Long" && rsi >= 45 && rsi <= 65) rsiBoost = 3;
    if (side === "Short" && rsi >= 35 && rsi <= 55) rsiBoost = 3;
  }

  const volatilityPenalty = volatility > 45 ? -5 : volatility > 35 ? -2 : 0;

  let categoryBoost = 0;
  switch (category) {
    case "intraday":
      categoryBoost = Math.abs(changePercent) * 1.2 + volumeBoost * 0.5;
      break;
    case "swing":
      categoryBoost = trendAligned * 0.3 + (fundamentalBoost > 0 ? fundamentalBoost : 0);
      break;
    case "breakout":
      categoryBoost = volumeBoost * 0.6 + adxBoost;
      break;
    case "momentum":
      categoryBoost = momentumAligned * 0.4;
      break;
    case "relative_volume":
      categoryBoost = volumeBoost;
      break;
    case "mean_reversion":
      categoryBoost = rsiBoost * 1.5;
      break;
    case "ai_high_conviction":
      categoryBoost =
        trendAligned * 0.2 +
        momentumAligned * 0.2 +
        fundamentalBoost +
        volumeBoost * 0.3;
      break;
  }

  const raw =
    52 +
    momentumAligned * 0.35 +
    trendAligned +
    volumeBoost +
    adxBoost +
    rsBoost +
    deliveryBoost +
    rsiBoost +
    volatilityPenalty +
    categoryBoost;

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
