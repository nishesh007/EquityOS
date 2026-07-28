/**
 * MODULE 3 — Performance Analytics
 */

import "server-only";

import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  classifyRegimeText,
  computeCohortStats,
  convictionBucketKey,
  groupClosedTrades,
  liquidityBucketFromText,
  loadClosedPaperTrades,
  resolveSector,
  riskRewardBucket,
  round2,
} from "@/lib/institutional-intelligence/shared";

export interface PerformanceBucketRow {
  key: string;
  trades: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
  sharpeStyle: number;
  averageReturn: number;
  averageHoldingDays: number;
}

function toRows(map: Map<string, PaperTrade[]>): PerformanceBucketRow[] {
  return [...map.entries()]
    .map(([key, trades]) => {
      const s = computeCohortStats(trades);
      return {
        key,
        trades: s.trades,
        winRate: s.winRate,
        expectancy: s.expectancy,
        profitFactor: s.profitFactor,
        sharpeStyle: s.sharpeStyle,
        averageReturn: s.averageReturn,
        averageHoldingDays: s.averageHoldingDays,
      };
    })
    .sort((a, b) => b.expectancy - a.expectancy || b.trades - a.trades);
}

export function buildPerformanceAnalytics(asOf?: string | null) {
  const closed = loadClosedPaperTrades(asOf);
  const overall = computeCohortStats(closed);

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: closed.length,
    overall: {
      winRate: overall.winRate,
      expectancy: overall.expectancy,
      profitFactor: overall.profitFactor,
      sharpeStyle: overall.sharpeStyle,
      averageReturn: overall.averageReturn,
      averageHoldingDays: overall.averageHoldingDays,
      averageMfe: overall.averageMfe,
      averageMae: overall.averageMae,
      trades: overall.trades,
      wins: overall.wins,
    },
    byStrategy: toRows(groupClosedTrades(closed, (t) => t.strategy)),
    bySector: toRows(groupClosedTrades(closed, (t) => resolveSector(t.symbol))),
    byMarketRegime: toRows(
      groupClosedTrades(closed, (t) =>
        classifyRegimeText(
          `${t.recommendation.marketRegime} ${t.recommendation.marketContext}`
        )
      )
    ),
    byLiquidity: toRows(
      groupClosedTrades(closed, (t) =>
        liquidityBucketFromText(
          t.recommendation.evidence.join(" "),
          t.recommendation.reasons.join(" ")
        )
      )
    ),
    byConviction: toRows(
      groupClosedTrades(closed, (t) =>
        convictionBucketKey(Math.max(t.conviction, t.confidence))
      )
    ),
    byRiskReward: toRows(
      groupClosedTrades(closed, (t) => riskRewardBucket(t.riskReward))
    ),
    notes: [
      "Sharpe-style score = mean return / stdev of closed trade returns (not annualized).",
      "Analytics are derived from completed paper-trading outcomes only.",
    ],
  };
}

export type PerformanceAnalyticsReport = ReturnType<
  typeof buildPerformanceAnalytics
>;

void round2;
