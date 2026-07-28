/**
 * Shared helpers for Institutional Intelligence Pack.
 * Reads closed paper outcomes only — never mutates persistence.
 */

import "server-only";

import { lookupCompanyRegistry } from "@/lib/fundamentals/company-registry";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { computeTradeExcursions } from "@/lib/paper-trading/outcomes/lifecycle";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  buildHistoricalExpectancyTables,
  classifyRegimeText,
  convictionBucketKey,
  liquidityBucketFromText,
  mapRecommendationToPaperStrategy,
  resolveSector,
  type ExpectancyStats,
  type HistoricalExpectancyTables,
} from "@/lib/recommendations/institutional-ranking/expectancy";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function loadClosedPaperTrades(asOf?: string | null): PaperTrade[] {
  const asOfMs = asOf ? Date.parse(asOf) : Number.POSITIVE_INFINITY;
  return loadPaperTradingState().trades.filter((trade) => {
    if (!isTradeClosed(trade)) return false;
    const exitMs = Date.parse(trade.exitAt ?? trade.updatedAt);
    if (!Number.isFinite(exitMs)) return false;
    return exitMs <= asOfMs;
  });
}

export function loadExpectancyTables(
  asOf?: string | null
): HistoricalExpectancyTables {
  return buildHistoricalExpectancyTables(loadPaperTradingState().trades, asOf);
}

export function recommendationKeys(rec: SharedRecommendation) {
  return {
    strategy: mapRecommendationToPaperStrategy(rec),
    sector: resolveSector(rec.symbol),
    regime: classifyRegimeText(`${rec.marketRegime} ${rec.marketContext}`),
    conviction: convictionBucketKey(Math.max(rec.conviction, rec.confidence)),
    liquidity: liquidityBucketFromText(
      (rec.evidence ?? []).join(" "),
      (rec.reasons ?? []).join(" ")
    ),
  };
}

export function riskRewardBucket(rr: number): string {
  if (rr < 1.5) return "lt-1.5";
  if (rr < 2) return "1.5-2";
  if (rr < 2.5) return "2-2.5";
  if (rr < 3) return "2.5-3";
  return "gte-3";
}

export function computeCohortStats(trades: PaperTrade[]): ExpectancyStats & {
  profitFactor: number;
  averageReturn: number;
  averageHoldingDays: number;
  averageMfe: number;
  averageMae: number;
  averageDrawdown: number;
  averageWin: number;
  averageLoss: number;
  sharpeStyle: number;
} {
  if (trades.length === 0) {
    return {
      trades: 0,
      wins: 0,
      winRate: 0,
      expectancy: 0,
      profitFactor: 0,
      averageReturn: 0,
      averageHoldingDays: 0,
      averageMfe: 0,
      averageMae: 0,
      averageDrawdown: 0,
      averageWin: 0,
      averageLoss: 0,
      sharpeStyle: 0,
    };
  }
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = wins.length / trades.length;
  const avgWin = average(wins.map((t) => t.returnPercent));
  const avgLoss = average(losses.map((t) => t.returnPercent));
  const avgLossAbs = Math.abs(avgLoss);
  const expectancy = round2(winRate * avgWin - (1 - winRate) * avgLossAbs);
  const grossProfit = wins.reduce((s, t) => s + Math.max(0, t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Math.min(0, t.pnl), 0));
  const returns = trades.map((t) => t.returnPercent);
  const mean = average(returns);
  const variance =
    returns.length > 1
      ? average(returns.map((r) => (r - mean) ** 2))
      : 0;
  const stdev = Math.sqrt(variance);
  const excursions = trades.map(computeTradeExcursions);
  return {
    trades: trades.length,
    wins: wins.length,
    winRate: round2(winRate * 100),
    expectancy,
    profitFactor:
      grossLoss > 0
        ? round2(grossProfit / grossLoss)
        : grossProfit > 0
          ? 99
          : 0,
    averageReturn: round2(mean),
    averageHoldingDays: round2(
      average(trades.map((t) => t.holdingMs)) / 86_400_000
    ),
    averageMfe: round2(average(excursions.map((e) => e.mfe))),
    averageMae: round2(average(excursions.map((e) => e.mae))),
    averageDrawdown: round2(average(excursions.map((e) => e.maxDrawdown))),
    averageWin: round2(avgWin),
    averageLoss: round2(avgLoss),
    sharpeStyle: round2(stdev > 0 ? mean / stdev : mean > 0 ? 3 : 0),
  };
}

export function groupClosedTrades(
  trades: PaperTrade[],
  keyFn: (trade: PaperTrade) => string
): Map<string, PaperTrade[]> {
  const map = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    const key = keyFn(trade);
    const list = map.get(key) ?? [];
    list.push(trade);
    map.set(key, list);
  }
  return map;
}

export {
  lookupCompanyRegistry,
  resolveSector,
  classifyRegimeText,
  convictionBucketKey,
  liquidityBucketFromText,
  mapRecommendationToPaperStrategy,
};
