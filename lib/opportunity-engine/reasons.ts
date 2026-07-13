import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

function num(
  metrics: Record<string, number | string | null>,
  key: string
): number | null {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface ConfidenceReasonContribution {
  label: string;
  contribution: number;
}

function pushReason(
  reasons: ConfidenceReasonContribution[],
  label: string,
  contribution: number
): void {
  if (contribution <= 0) return;
  reasons.push({ label, contribution: Math.round(contribution) });
}

function computePenaltyContribution(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward: number
): number {
  const volatility = num(metrics, "volatility") ?? 0;
  const rsi = num(metrics, "rsi") ?? 50;
  let penalty = 0;
  if (volatility > 50) penalty += 5;
  else if (volatility > 45) penalty += 3;
  if (side === "Long" && rsi > 78) penalty += 4;
  if (side === "Short" && rsi < 22) penalty += 4;
  if (riskReward < 1.5) penalty += 3;
  if (category === "mean_reversion" && Math.abs(rsi - 50) < 8) penalty += 2;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  if (volumeRatio < 1.1) penalty += 2;
  const adx = num(metrics, "adx") ?? 0;
  if (adx < 18 && category !== "mean_reversion") penalty += 2;
  return Math.round(penalty);
}

/**
 * Builds explainable confidence reasons with point contributions from live metrics.
 */
export function buildConfidenceReasonContributions(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward = 2
): ConfidenceReasonContribution[] {
  const reasons: ConfidenceReasonContribution[] = [];

  const price = num(metrics, "cmp");
  const ema20 = num(metrics, "ema20");
  const ema200 = num(metrics, "ema200");
  const changePercent = num(metrics, "change_percent");
  const volumeRatio = num(metrics, "volume_ratio");
  const rsi = num(metrics, "rsi");
  const rsiPrev = num(metrics, "rsi_prev");
  const adx = num(metrics, "adx");
  const deliveryPercent = num(metrics, "delivery_percent");
  const relativeStrength = num(metrics, "relative_strength");
  const momentum = num(metrics, "momentum");
  const priceToHigh = num(metrics, "price_to_52w_high");
  const fundamentalScore = num(metrics, "fundamental_score");
  const bollingerWidth = num(metrics, "bollinger_width");
  const macdHist = num(metrics, "macd_histogram");
  const macdLine = num(metrics, "macd");
  const macdSignal = num(metrics, "macd_signal");
  const closingStrength = num(metrics, "closing_strength");
  const revenueGrowth = num(metrics, "revenue_growth");
  const momentumValue = momentum ?? 0;

  if (side === "Long" && price !== null && ema20 !== null && price > ema20) {
    pushReason(reasons, "Breakout above 20 DMA", 10);
  }
  if (side === "Short" && price !== null && ema20 !== null && price < ema20) {
    pushReason(reasons, "Breakdown below 20 DMA", 10);
  }

  if (side === "Long" && price !== null && ema200 !== null && price > ema200) {
    pushReason(reasons, "Breakout above 200 DMA", 8);
  }
  if (side === "Short" && price !== null && ema200 !== null && price < ema200) {
    pushReason(reasons, "Breakdown below 200 DMA", 8);
  }

  if (rsi !== null && rsiPrev !== null) {
    if (side === "Long" && rsiPrev <= 35 && rsi > rsiPrev && rsi <= 55) {
      pushReason(reasons, "RSI Recovery", 12);
    } else if (side === "Short" && rsiPrev >= 65 && rsi < rsiPrev && rsi >= 45) {
      pushReason(reasons, "RSI Recovery", 12);
    } else if (side === "Long" && rsi >= 50 && rsi <= 72 && momentumValue > 0) {
      pushReason(reasons, `RSI ${Math.round(rsi)} momentum`, 8);
    }
  } else if (rsi !== null && category === "mean_reversion") {
    if (rsi <= 35 && side === "Long") pushReason(reasons, `RSI ${Math.round(rsi)} oversold`, 14);
    if (rsi >= 65 && side === "Short") pushReason(reasons, `RSI ${Math.round(rsi)} overbought`, 14);
  }

  if (adx !== null && adx >= 25) {
    pushReason(reasons, "ADX Trend", adx >= 30 ? 11 : 8);
  }

  if (macdHist !== null && macdLine !== null && macdSignal !== null) {
    if (side === "Long" && macdHist > 0 && macdLine > macdSignal) {
      pushReason(reasons, "MACD Bullish Cross", 10);
    } else if (side === "Short" && macdHist < 0 && macdLine < macdSignal) {
      pushReason(reasons, "MACD Bearish Cross", 10);
    }
  }

  if (volumeRatio !== null && volumeRatio >= 1.5) {
    const volContrib = volumeRatio >= 2.5 ? 18 : volumeRatio >= 2 ? 15 : 12;
    pushReason(reasons, "Volume Surge", volContrib);
  } else if (volumeRatio !== null && volumeRatio >= 1.2 && category === "relative_volume") {
    pushReason(reasons, "Volume Surge", 8);
  }

  if (deliveryPercent !== null && deliveryPercent >= 35) {
    pushReason(reasons, "Delivery Above Avg", 8);
  }

  if (
    deliveryPercent !== null &&
    deliveryPercent >= 40 &&
    volumeRatio !== null &&
    volumeRatio >= 1.3
  ) {
    pushReason(reasons, "Institutional Buying", 14);
  }

  if (relativeStrength !== null && relativeStrength >= 58 && side === "Long") {
    pushReason(reasons, "Relative Strength", 14);
  } else if (relativeStrength !== null && relativeStrength <= 42 && side === "Short") {
    pushReason(reasons, "Relative Weakness", 14);
  }

  if (closingStrength !== null && closingStrength >= 75 && side === "Long") {
    pushReason(reasons, "Closing Strength", 10);
  } else if (closingStrength !== null && closingStrength <= 25 && side === "Short") {
    pushReason(reasons, "Weak Close", 10);
  }

  if (
    side === "Long" &&
    changePercent !== null &&
    changePercent >= 1.5 &&
    volumeRatio !== null &&
    volumeRatio >= 1.4 &&
    momentum !== null &&
    momentum > 0
  ) {
    pushReason(reasons, "Momentum Breakout", 14);
  }

  if (side === "Long" && priceToHigh !== null && priceToHigh >= 95 && priceToHigh < 100) {
    pushReason(reasons, "Near 52W High", 9);
  }

  if (category === "breakout" && bollingerWidth !== null && bollingerWidth >= 8) {
    pushReason(reasons, "Volatility Squeeze", 11);
  }

  if (fundamentalScore !== null && fundamentalScore >= 62) {
    pushReason(reasons, "Fundamentals", 20);
  } else if (fundamentalScore !== null && fundamentalScore >= 55) {
    pushReason(reasons, "Fundamentals", 12);
  }

  if (revenueGrowth !== null && revenueGrowth >= 15 && fundamentalScore !== null && fundamentalScore >= 55) {
    pushReason(reasons, "Earnings Catalyst", 10);
  }

  if (
    changePercent !== null &&
    changePercent >= 1.2 &&
    volumeRatio !== null &&
    volumeRatio >= 1.3 &&
    side === "Long"
  ) {
    pushReason(reasons, "Gap Probability", 6);
  }

  if (category === "momentum" && momentum !== null && Math.abs(momentum) >= 2) {
    pushReason(
      reasons,
      side === "Long" ? "Momentum Acceleration" : "Momentum Deceleration",
      13
    );
  }

  if (relativeStrength !== null && relativeStrength >= 55 && side === "Long") {
    pushReason(reasons, "Sector Momentum", 12);
  }

  if (category === "swing" && fundamentalScore !== null && fundamentalScore >= 55) {
    pushReason(reasons, "Swing Fundamentals", 8);
  }

  const penalty = computePenaltyContribution(metrics, category, side, riskReward);
  if (penalty > 0) {
    reasons.push({ label: "Penalty", contribution: -penalty });
  }

  return reasons
    .filter((item) => item.label !== "Penalty" || item.contribution < 0)
    .sort((a, b) => {
      if (a.contribution < 0) return 1;
      if (b.contribution < 0) return -1;
      return b.contribution - a.contribution;
    })
    .slice(0, 8);
}

export function buildConfidenceReasons(
  metrics: Record<string, number | string | null>,
  category: OpportunityCategory,
  side: "Long" | "Short",
  riskReward = 2
): string[] {
  return buildConfidenceReasonContributions(metrics, category, side, riskReward)
    .filter((reason) => reason.contribution > 0)
    .map((reason) => reason.label);
}

export function formatConfidenceReasons(reasons: string[]): string {
  if (reasons.length === 0) return "";
  return reasons.map((reason) => `✓ ${reason}`).join("\n");
}

export function confidenceContributionsTotal(
  contributions: ConfidenceReasonContribution[]
): number {
  return contributions.reduce((sum, item) => sum + item.contribution, 0);
}

export function resolveConfidenceContributions(candidate: {
  confidenceReasonContributions?: ConfidenceReasonContribution[];
  confidenceReasons?: string[];
  scanMetrics?: Record<string, number | string | null>;
  category: OpportunityCategory;
  side: "Long" | "Short";
  confidencePercent: number;
  aiConvictionScore?: number;
  riskReward?: number;
}): ConfidenceReasonContribution[] {
  if (candidate.confidenceReasonContributions?.length) {
    return candidate.confidenceReasonContributions;
  }

  if (candidate.scanMetrics) {
    const computed = buildConfidenceReasonContributions(
      candidate.scanMetrics,
      candidate.category,
      candidate.side,
      candidate.riskReward ?? 2
    );
    if (computed.length > 0) return computed;
  }

  return (candidate.confidenceReasons ?? []).map((label, index) => ({
    label,
    contribution: Math.max(1, Math.round(candidate.confidencePercent / Math.max(1, (candidate.confidenceReasons?.length ?? 1))) - index),
  }));
}
