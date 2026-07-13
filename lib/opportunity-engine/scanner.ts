import type {
  CategoryScanCandidate,
  OpportunityCategory,
} from "@/lib/opportunity-engine/types";
import {
  CATEGORY_LIMITS,
  OPPORTUNITY_CATEGORIES,
} from "@/lib/opportunity-engine/types";
import {
  computeLiveAiConviction,
  computeLiveConfidence,
} from "@/lib/opportunity-engine/conviction";
import type { LiveMetricsRecord } from "@/lib/opportunity-engine/live-metrics";

function num(metrics: LiveMetricsRecord, key: string): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function requiresTechnicals(category: OpportunityCategory): boolean {
  return category !== "intraday" && category !== "relative_volume";
}

function hasLiveQuote(metrics: LiveMetricsRecord): boolean {
  return metrics.has_live_quote === 1 && num(metrics, "cmp") !== null;
}

function scoreIntraday(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics)) return null;

  const changePercent = num(metrics, "change_percent") ?? 0;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const adx = num(metrics, "adx") ?? 0;
  const momentum = num(metrics, "momentum") ?? 0;
  const deliveryPercent = num(metrics, "delivery_percent") ?? 0;

  if (Math.abs(changePercent) < 0.5 && volumeRatio < 1.1) return null;

  const side: "Long" | "Short" = changePercent >= 0 ? "Long" : "Short";
  const score =
    Math.abs(changePercent) * 10 +
    volumeRatio * 14 +
    adx * 0.35 +
    Math.abs(momentum) * 0.35 +
    deliveryPercent * 0.08;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "intraday",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "intraday", side),
    confidencePercent: computeLiveConfidence(metrics, "intraday"),
    reason: `${side} setup: ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% session move, ${volumeRatio.toFixed(1)}x relative volume${deliveryPercent > 0 ? `, ${deliveryPercent.toFixed(0)}% delivery` : ""}`,
    metrics: {
      change_percent: changePercent,
      volume_ratio: volumeRatio,
      adx,
      momentum,
      delivery_percent: deliveryPercent,
    },
  };
}

function scoreSwing(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics) || metrics.has_live_technicals !== 1) return null;

  const trendScore = num(metrics, "trend_score");
  const fundamentalScore = num(metrics, "fundamental_score");
  const relativeStrength = num(metrics, "relative_strength") ?? 50;
  const roe = num(metrics, "roe");
  const revenueGrowth = num(metrics, "revenue_growth");

  if (trendScore === null) return null;
  if (trendScore < 52 && (fundamentalScore === null || fundamentalScore < 52)) return null;

  const side: "Long" | "Short" = trendScore >= 50 ? "Long" : "Short";
  const score =
    trendScore * 0.4 +
    (fundamentalScore ?? 50) * 0.3 +
    relativeStrength * 0.2 +
    (roe ?? 0) * 0.4 +
    (revenueGrowth ?? 0) * 0.25;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "swing",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "swing", side),
    confidencePercent: computeLiveConfidence(metrics, "swing"),
    reason: `Swing ${side.toLowerCase()}: trend ${trendScore.toFixed(0)}${fundamentalScore !== null ? `, fundamentals ${fundamentalScore.toFixed(0)}` : ""}, RS ${relativeStrength.toFixed(0)}`,
    metrics: {
      trend_score: trendScore,
      fundamental_score: fundamentalScore,
      relative_strength: relativeStrength,
    },
  };
}

function scoreBreakout(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics) || metrics.has_live_technicals !== 1) return null;

  const priceToHigh = num(metrics, "price_to_52w_high");
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const adx = num(metrics, "adx") ?? 0;
  const changePercent = num(metrics, "change_percent") ?? 0;
  const athDistance = num(metrics, "ath_distance");

  const nearHigh = priceToHigh !== null ? priceToHigh >= 90 : (athDistance ?? -100) > -10;
  if (!nearHigh && volumeRatio < 1.4) return null;

  const side: "Long" | "Short" = changePercent >= 0 ? "Long" : "Short";
  const score =
    (priceToHigh ?? 100 + (athDistance ?? 0)) * 0.35 +
    volumeRatio * 16 +
    adx * 0.45 +
    Math.abs(changePercent) * 6;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "breakout",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "breakout", side),
    confidencePercent: computeLiveConfidence(metrics, "breakout"),
    reason: `Breakout candidate: ${priceToHigh !== null ? `${priceToHigh.toFixed(0)}% of 52W high` : `${Math.abs(athDistance ?? 0).toFixed(0)}% from ATH`}, ${volumeRatio.toFixed(1)}x volume`,
    metrics: { price_to_52w_high: priceToHigh, volume_ratio: volumeRatio, adx },
  };
}

function scoreMomentum(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics) || metrics.has_live_technicals !== 1) return null;

  const momentum = num(metrics, "momentum");
  const week52Momentum = num(metrics, "week52_momentum");
  const relativeStrength = num(metrics, "relative_strength");
  const changePercent = num(metrics, "change_percent") ?? 0;

  if (
    (momentum === null || Math.abs(momentum) < 2) &&
    (week52Momentum === null || week52Momentum < 10) &&
    (relativeStrength === null || relativeStrength < 55)
  ) {
    return null;
  }

  const side: "Long" | "Short" = (momentum ?? changePercent) >= 0 ? "Long" : "Short";
  const score =
    Math.abs(momentum ?? changePercent) * 1.8 +
    (week52Momentum ?? 0) * 0.55 +
    (relativeStrength ?? 50) * 0.35;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "momentum",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "momentum", side),
    confidencePercent: computeLiveConfidence(metrics, "momentum"),
    reason: `Momentum leader: ${(momentum ?? changePercent) >= 0 ? "+" : ""}${(momentum ?? changePercent).toFixed(1)}% momentum, 52W ${(week52Momentum ?? 0).toFixed(0)}%, RS ${(relativeStrength ?? 0).toFixed(0)}`,
    metrics: {
      momentum: momentum ?? changePercent,
      week52_momentum: week52Momentum,
      relative_strength: relativeStrength,
    },
  };
}

function scoreRelativeVolume(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics)) return null;

  const volumeRatio = num(metrics, "volume_ratio");
  const changePercent = num(metrics, "change_percent") ?? 0;
  const deliveryPercent = num(metrics, "delivery_percent") ?? 0;

  if (volumeRatio === null || volumeRatio < 1.5) return null;

  const side: "Long" | "Short" = changePercent >= 0 ? "Long" : "Short";
  const score = volumeRatio * 22 + Math.abs(changePercent) * 7 + deliveryPercent * 0.15;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "relative_volume",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "relative_volume", side),
    confidencePercent: computeLiveConfidence(metrics, "relative_volume"),
    reason: `Unusual volume: ${volumeRatio.toFixed(1)}x avg, ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% price action`,
    metrics: { volume_ratio: volumeRatio, change_percent: changePercent, delivery_percent: deliveryPercent },
  };
}

function scoreMeanReversion(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics) || metrics.has_live_technicals !== 1) return null;

  const rsiValue = num(metrics, "rsi");
  const bollingerWidth = num(metrics, "bollinger_width") ?? 0;
  const changePercent = num(metrics, "change_percent") ?? 0;

  if (rsiValue === null) return null;

  const oversold = rsiValue <= 35;
  const overbought = rsiValue >= 65;
  if (!oversold && !overbought) return null;

  const side: "Long" | "Short" = oversold ? "Long" : "Short";
  const extremity = oversold ? 35 - rsiValue : rsiValue - 65;
  const score = extremity * 4.5 + bollingerWidth * 0.45 + Math.abs(changePercent) * 3;

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "mean_reversion",
    side,
    score,
    aiConvictionScore: computeLiveAiConviction(metrics, "mean_reversion", side),
    confidencePercent: computeLiveConfidence(metrics, "mean_reversion"),
    reason: `Mean reversion ${side.toLowerCase()}: RSI ${rsiValue.toFixed(0)} ${oversold ? "oversold" : "overbought"}, BB width ${bollingerWidth.toFixed(0)}%`,
    metrics: { rsi: rsiValue, bollinger_width: bollingerWidth },
  };
}

function scoreAiHighConviction(metrics: LiveMetricsRecord): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics) || metrics.has_live_technicals !== 1) return null;

  const trendScore = num(metrics, "trend_score") ?? 50;
  const momentum = num(metrics, "momentum") ?? num(metrics, "change_percent") ?? 0;
  const relativeStrength = num(metrics, "relative_strength") ?? 50;
  const fundamentalScore = num(metrics, "fundamental_score");
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const volatility = num(metrics, "volatility") ?? 0;

  const composite =
    trendScore * 0.3 +
    relativeStrength * 0.25 +
    Math.abs(momentum) * 0.8 +
    (fundamentalScore ?? 50) * 0.25 +
    volumeRatio * 4 -
    volatility * 0.1;

  if (composite < 68) return null;

  const side: "Long" | "Short" = momentum >= 0 ? "Long" : "Short";

  return {
    symbol: String(metrics.symbol ?? ""),
    company: String(metrics.name ?? metrics.symbol ?? ""),
    category: "ai_high_conviction",
    side,
    score: composite,
    aiConvictionScore: computeLiveAiConviction(metrics, "ai_high_conviction", side),
    confidencePercent: computeLiveConfidence(metrics, "ai_high_conviction"),
    reason: `High conviction: trend ${trendScore.toFixed(0)}, RS ${relativeStrength.toFixed(0)}${fundamentalScore !== null ? `, fundamentals ${fundamentalScore.toFixed(0)}` : ""}, ${volumeRatio.toFixed(1)}x volume`,
    metrics: {
      trend_score: trendScore,
      relative_strength: relativeStrength,
      fundamental_score: fundamentalScore,
      volume_ratio: volumeRatio,
    },
  };
}

const SCORERS: Record<
  OpportunityCategory,
  (metrics: LiveMetricsRecord) => CategoryScanCandidate | null
> = {
  intraday: scoreIntraday,
  swing: scoreSwing,
  breakout: scoreBreakout,
  momentum: scoreMomentum,
  relative_volume: scoreRelativeVolume,
  mean_reversion: scoreMeanReversion,
  ai_high_conviction: scoreAiHighConviction,
};

const SHORTLIST_MULTIPLIER = 4;

export function scanLiveMetrics(
  metricsRows: LiveMetricsRecord[]
): Record<OpportunityCategory, CategoryScanCandidate[]> {
  const results = OPPORTUNITY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as Record<OpportunityCategory, CategoryScanCandidate[]>
  );

  for (const metrics of metricsRows) {
    const symbol = String(metrics.symbol ?? "");
    if (!symbol || !hasLiveQuote(metrics)) continue;

    for (const category of OPPORTUNITY_CATEGORIES) {
      if (requiresTechnicals(category) && metrics.has_live_technicals !== 1) continue;
      const candidate = SCORERS[category](metrics);
      if (candidate && candidate.score > 0) {
        results[category].push(candidate);
      }
    }
  }

  for (const category of OPPORTUNITY_CATEGORIES) {
    const limit = CATEGORY_LIMITS[category] * SHORTLIST_MULTIPLIER;
    results[category] = results[category]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  return results;
}

export function rescoreCategory(
  category: OpportunityCategory,
  metrics: LiveMetricsRecord
): CategoryScanCandidate | null {
  if (!hasLiveQuote(metrics)) return null;
  if (requiresTechnicals(category) && metrics.has_live_technicals !== 1) return null;
  return SCORERS[category](metrics);
}

export function collectShortlistSymbols(
  categoryResults: Record<OpportunityCategory, CategoryScanCandidate[]>
): string[] {
  const symbols = new Set<string>();
  for (const category of OPPORTUNITY_CATEGORIES) {
    for (const candidate of categoryResults[category]) {
      symbols.add(candidate.symbol.toUpperCase());
    }
  }
  return [...symbols];
}

export function selectTopCandidates(
  category: OpportunityCategory,
  candidates: CategoryScanCandidate[]
): CategoryScanCandidate[] {
  const limit = CATEGORY_LIMITS[category];
  return [...candidates].sort((a, b) => b.score - a.score).slice(0, limit);
}
