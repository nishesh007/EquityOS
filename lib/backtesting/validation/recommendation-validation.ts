import { percentOf, roundMetric } from "@/lib/analytics";
import type {
  RecommendationValidationMetrics,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";
import { closedTradesOnly } from "@/lib/backtesting/validation/metrics";

/**
 * Entry timing accuracy: share of entries within ±40 bps of intended entry.
 */
function entryTimingAccuracy(trades: readonly ValidationTradeRecord[]): number | null {
  const withTiming = trades.filter((t) => t.entryTimingBps != null);
  if (withTiming.length === 0) return null;
  const accurate = withTiming.filter(
    (t) => Math.abs(t.entryTimingBps as number) <= 40
  ).length;
  return roundMetric(percentOf(accurate, withTiming.length), 1);
}

function stopLossAccuracy(trades: readonly ValidationTradeRecord[]): number | null {
  const losers = trades.filter((t) => t.returnPercent < 0);
  if (losers.length === 0) return null;
  // Among losers, stops that fired (vs open-ended adverse moves) count as accurate risk control.
  const stopped = losers.filter((t) => t.hitStopLoss).length;
  return roundMetric(percentOf(stopped, losers.length), 1);
}

function targetAccuracy(trades: readonly ValidationTradeRecord[]): number | null {
  const winners = trades.filter((t) => t.returnPercent > 0);
  if (winners.length === 0) return null;
  const targeted = winners.filter((t) => t.hitTarget).length;
  return roundMetric(percentOf(targeted, winners.length), 1);
}

/**
 * Conviction accuracy: high conviction (≥70) wins more often than low (<55).
 * Score is the win-rate spread (clamped 0–100).
 */
function convictionAccuracy(trades: readonly ValidationTradeRecord[]): number | null {
  const withConv = trades.filter((t) => t.conviction != null);
  if (withConv.length < 2) return null;
  const high = withConv.filter((t) => (t.conviction as number) >= 70);
  const low = withConv.filter((t) => (t.conviction as number) < 55);
  if (high.length === 0 || low.length === 0) return null;
  const highWr = percentOf(
    high.filter((t) => t.returnPercent > 0).length,
    high.length
  );
  const lowWr = percentOf(
    low.filter((t) => t.returnPercent > 0).length,
    low.length
  );
  return roundMetric(Math.max(0, Math.min(100, 50 + (highWr - lowWr))), 1);
}

/**
 * Risk classification: moderate/elevated labels should show different avg returns.
 */
function riskClassificationAccuracy(
  trades: readonly ValidationTradeRecord[]
): number | null {
  const labeled = trades.filter((t) => t.riskLabel);
  if (labeled.length < 2) return null;
  const moderate = labeled.filter((t) =>
    /moderate|low/i.test(t.riskLabel as string)
  );
  const elevated = labeled.filter((t) =>
    /elevat|high|aggressive/i.test(t.riskLabel as string)
  );
  if (moderate.length === 0 || elevated.length === 0) return null;
  const modLoss = percentOf(
    moderate.filter((t) => t.returnPercent < 0).length,
    moderate.length
  );
  const elevLoss = percentOf(
    elevated.filter((t) => t.returnPercent < 0).length,
    elevated.length
  );
  // Elevated should lose at least as often; score by ordering correctness.
  return elevLoss >= modLoss
    ? roundMetric(70 + Math.min(30, elevLoss - modLoss), 1)
    : roundMetric(40 - Math.min(40, modLoss - elevLoss), 1);
}

/** Consistency: share of trades with recommendationScore present + coherent outcome. */
function recommendationConsistency(
  trades: readonly ValidationTradeRecord[]
): number | null {
  if (trades.length === 0) return null;
  const scored = trades.filter((t) => t.recommendationScore != null);
  if (scored.length === 0) return null;
  const coherent = scored.filter((t) => {
    const score = t.recommendationScore as number;
    if (score >= 70) return t.returnPercent >= 0;
    if (score < 55) return true; // low score: any outcome acceptable
    return Math.abs(t.returnPercent) < 8;
  }).length;
  return roundMetric(percentOf(coherent, scored.length), 1);
}

export function evaluateRecommendationQuality(
  trades: readonly ValidationTradeRecord[]
): RecommendationValidationMetrics {
  const closed = closedTradesOnly(trades);
  const notes: string[] = [];
  if (closed.length === 0) {
    notes.push("No closed trades available for recommendation validation.");
  }

  return {
    sampleSize: closed.length,
    entryTimingAccuracy: entryTimingAccuracy(closed),
    stopLossAccuracy: stopLossAccuracy(closed),
    targetAccuracy: targetAccuracy(closed),
    convictionAccuracy: convictionAccuracy(closed),
    riskClassificationAccuracy: riskClassificationAccuracy(closed),
    recommendationConsistency: recommendationConsistency(closed),
    notes,
  };
}
