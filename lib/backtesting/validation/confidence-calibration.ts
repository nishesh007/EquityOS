import { roundMetric, computeTradeStatistics } from "@/lib/analytics";
import type {
  ConvictionBucketRow,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";
import { closedTradesOnly } from "@/lib/backtesting/validation/metrics";

const BUCKETS = [
  { id: "low", label: "Low (<55)", minInclusive: 0, maxExclusive: 55 },
  { id: "medium", label: "Medium (55–70)", minInclusive: 55, maxExclusive: 70 },
  { id: "high", label: "High (70–85)", minInclusive: 70, maxExclusive: 85 },
  { id: "elite", label: "Elite (≥85)", minInclusive: 85, maxExclusive: 101 },
] as const;

/**
 * Compare predicted conviction vs realized outcomes by bucket.
 * Calibration gap = expected win rate from mid-bucket conviction − realized win rate.
 */
export function buildConvictionCalibration(
  trades: readonly ValidationTradeRecord[]
): ConvictionBucketRow[] {
  const closed = closedTradesOnly(trades).filter((t) => t.conviction != null);

  return BUCKETS.map((bucket) => {
    const inBucket = closed.filter((t) => {
      const c = t.conviction as number;
      return c >= bucket.minInclusive && c < bucket.maxExclusive;
    });
    const stats = computeTradeStatistics(
      inBucket.map((t) => ({
        returnPercent: t.returnPercent,
        pnl: t.pnl,
        holdingMs: t.holdingMs,
        hitTarget: t.hitTarget,
        hitStopLoss: t.hitStopLoss,
      }))
    );
    const expected =
      bucket.id === "low"
        ? 45
        : bucket.id === "medium"
          ? 55
          : bucket.id === "high"
            ? 65
            : 75;
    const gap =
      inBucket.length === 0
        ? null
        : roundMetric(expected - stats.winRate, 1);
    return {
      id: bucket.id,
      label: bucket.label,
      minInclusive: bucket.minInclusive,
      maxExclusive: bucket.maxExclusive,
      tradeCount: inBucket.length,
      winRate: roundMetric(stats.winRate, 1),
      averageReturn: stats.averageReturn,
      profitFactor: stats.profitFactor,
      calibrationGap: gap,
      highlight: gap != null && Math.abs(gap) >= 12,
    };
  });
}

export function calibrationSummary(rows: readonly ConvictionBucketRow[]): string {
  const highlighted = rows.filter((r) => r.highlight && r.tradeCount > 0);
  if (highlighted.length === 0) {
    return "Conviction buckets are broadly aligned with realized outcomes.";
  }
  return highlighted
    .map(
      (r) =>
        `${r.label}: realized win rate ${r.winRate.toFixed(1)}% vs expected (gap ${r.calibrationGap} pts)`
    )
    .join(" · ");
}
