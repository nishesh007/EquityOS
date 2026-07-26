import type { AnalyticsInsight } from "@/lib/analytics/types";
import type {
  ConvictionBucketRow,
  FailureAnalysisResult,
  RecommendationValidationMetrics,
  StrategyPerformanceRow,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";
import { closedTradesOnly } from "@/lib/backtesting/validation/metrics";

export function generateValidationInsights(input: {
  trades: readonly ValidationTradeRecord[];
  strategyComparison: readonly StrategyPerformanceRow[];
  regimeComparison: readonly StrategyPerformanceRow[];
  recommendationValidation: RecommendationValidationMetrics;
  convictionBuckets: readonly ConvictionBucketRow[];
  failureAnalysis: FailureAnalysisResult;
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const closed = closedTradesOnly(input.trades);

  const bestStrategy = input.strategyComparison[0];
  if (bestStrategy && bestStrategy.tradeCount > 0) {
    insights.push({
      id: "best_strategy",
      title: "Best performing strategy",
      body: `${bestStrategy.label} leads with ${bestStrategy.totalReturn.toFixed(2)}% cumulative return across ${bestStrategy.tradeCount} closed trades (win rate ${bestStrategy.statistics.winRate.toFixed(1)}%).`,
      tone: bestStrategy.totalReturn >= 0 ? "positive" : "caution",
    });
  }

  const weakestRegime = [...input.regimeComparison].sort(
    (a, b) => a.totalReturn - b.totalReturn
  )[0];
  if (weakestRegime && weakestRegime.tradeCount > 0) {
    insights.push({
      id: "weakest_regime",
      title: "Weakest market regime",
      body: `${weakestRegime.label} produced the weakest results (${weakestRegime.totalReturn.toFixed(2)}% cumulative, win rate ${weakestRegime.statistics.winRate.toFixed(1)}%).`,
      tone: "caution",
    });
  }

  const rv = input.recommendationValidation;
  if (rv.sampleSize > 0) {
    const scores = [
      rv.entryTimingAccuracy,
      rv.targetAccuracy,
      rv.convictionAccuracy,
      rv.recommendationConsistency,
    ].filter((v): v is number => v != null);
    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
    insights.push({
      id: "recommendation_quality",
      title: "Highest quality recommendation profile",
      body:
        avg == null
          ? "Insufficient recommendation metadata to score quality profile."
          : `Blended recommendation quality score ≈ ${avg.toFixed(0)}/100 (entry timing ${rv.entryTimingAccuracy ?? "—"}%, target accuracy ${rv.targetAccuracy ?? "—"}%, consistency ${rv.recommendationConsistency ?? "—"}%).`,
      tone: avg != null && avg >= 60 ? "positive" : "caution",
    });
  }

  if (input.failureAnalysis.losingTrades > 0) {
    insights.push({
      id: "common_failures",
      title: "Common failure patterns",
      body: input.failureAnalysis.summary,
      tone: "caution",
    });
  }

  const gaps = input.convictionBuckets.filter((b) => b.highlight);
  if (gaps.length > 0) {
    insights.push({
      id: "calibration_gaps",
      title: "Suggested improvement areas",
      body: `Recalibrate conviction for: ${gaps.map((g) => g.label).join(", ")}. Narrow entry bands where late entries cluster, and review stop distance on elevated-risk labels.`,
      tone: "caution",
    });
  } else if (closed.length > 0) {
    insights.push({
      id: "calibration_ok",
      title: "Suggested improvement areas",
      body: "No large conviction calibration gaps detected. Focus next on expanding sample size across regimes for sharper Sortino/Sharpe reads.",
      tone: "neutral",
    });
  }

  return insights;
}
