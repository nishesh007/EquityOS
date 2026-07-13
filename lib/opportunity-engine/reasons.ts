import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

function num(
  metrics: Record<string, number | string | null>,
  key: string
): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Builds explainable confidence reasons from live metrics.
 * Only includes reasons that are substantiated by actual data.
 */
export function buildConfidenceReasons(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short"
): string[] {
  const reasons: string[] = [];

  const changePercent = num(metrics, "change_percent");
  const volumeRatio = num(metrics, "volume_ratio");
  const rsi = num(metrics, "rsi");
  const adx = num(metrics, "adx");
  const deliveryPercent = num(metrics, "delivery_percent");
  const relativeStrength = num(metrics, "relative_strength");
  const trendScore = num(metrics, "trend_score");
  const momentum = num(metrics, "momentum");
  const priceToHigh = num(metrics, "price_to_52w_high");
  const fundamentalScore = num(metrics, "fundamental_score");
  const bollingerWidth = num(metrics, "bollinger_width");
  const sector = typeof metrics.sector === "string" ? metrics.sector : null;

  if (side === "Long" && priceToHigh !== null && priceToHigh >= 97) {
    reasons.push("Breakout above resistance");
  }

  if (side === "Short" && priceToHigh !== null && priceToHigh <= 85) {
    reasons.push("Breakdown below key support");
  }

  if (volumeRatio !== null && volumeRatio >= 1.5) {
    reasons.push(`Volume ${volumeRatio.toFixed(1)}x average`);
  } else if (volumeRatio !== null && volumeRatio >= 1.2 && category === "relative_volume") {
    reasons.push(`Volume ${volumeRatio.toFixed(1)}x average`);
  }

  if (rsi !== null) {
    if (side === "Long" && rsi >= 50 && rsi <= 72 && (momentum ?? 0) > 0) {
      reasons.push(`RSI ${Math.round(rsi)} rising`);
    } else if (side === "Short" && rsi >= 28 && rsi <= 50 && (momentum ?? 0) < 0) {
      reasons.push(`RSI ${Math.round(rsi)} weakening`);
    } else if (category === "mean_reversion" && rsi <= 35) {
      reasons.push(`RSI ${Math.round(rsi)} oversold bounce`);
    } else if (category === "mean_reversion" && rsi >= 65) {
      reasons.push(`RSI ${Math.round(rsi)} overbought fade`);
    }
  }

  if (adx !== null && adx >= 25) {
    reasons.push("ADX trend confirmed");
  }

  if (deliveryPercent !== null && deliveryPercent >= 35) {
    reasons.push("Delivery above average");
  }

  if (relativeStrength !== null && relativeStrength >= 58) {
    reasons.push("Relative Strength outperforming Nifty");
  } else if (relativeStrength !== null && relativeStrength <= 42 && side === "Short") {
    reasons.push("Relative Strength underperforming Nifty");
  }

  if (trendScore !== null && trendScore >= 58 && side === "Long") {
    reasons.push("Closing above key MA");
  } else if (trendScore !== null && trendScore <= 42 && side === "Short") {
    reasons.push("Trading below key MA");
  }

  if (fundamentalScore !== null && fundamentalScore >= 62) {
    reasons.push("Strong fundamental quality");
  }

  if (
    changePercent !== null &&
    changePercent >= 1.2 &&
    volumeRatio !== null &&
    volumeRatio >= 1.3 &&
    side === "Long"
  ) {
    reasons.push("Gap-up probability elevated");
  }

  if (category === "breakout" && bollingerWidth !== null && bollingerWidth >= 8) {
    reasons.push("Volatility squeeze breakout");
  }

  if (category === "momentum" && momentum !== null && Math.abs(momentum) >= 2) {
    reasons.push(
      side === "Long" ? "Momentum accelerating higher" : "Momentum accelerating lower"
    );
  }

  if (sector && changePercent !== null && Math.abs(changePercent) >= 1) {
    reasons.push(
      side === "Long" ? `Strong ${sector} sector momentum` : `Weak ${sector} sector momentum`
    );
  }

  if (category === "swing" && fundamentalScore !== null && fundamentalScore >= 55) {
    reasons.push("Swing-quality fundamental backdrop");
  }

  return reasons.slice(0, 7);
}

export function formatConfidenceReasons(reasons: string[]): string {
  if (reasons.length === 0) return "";
  return reasons.map((reason) => `✓ ${reason}`).join("\n");
}
