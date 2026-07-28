/**
 * Historical expectancy tables from completed paper-trading outcomes only.
 * Never looks at open trades or future timestamps beyond asOf.
 */

import { lookupCompanyRegistry } from "@/lib/fundamentals/company-registry";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

export interface ExpectancyStats {
  trades: number;
  wins: number;
  winRate: number;
  expectancy: number;
}

export interface HistoricalExpectancyTables {
  overall: ExpectancyStats;
  byStrategy: Map<string, ExpectancyStats>;
  bySector: Map<string, ExpectancyStats>;
  byRegime: Map<string, ExpectancyStats>;
  byConviction: Map<string, ExpectancyStats>;
  byLiquidity: Map<string, ExpectancyStats>;
  closedTradesUsed: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function emptyExpectancyStats(): ExpectancyStats {
  return { trades: 0, wins: 0, winRate: 0, expectancy: 0 };
}

function computeStats(trades: PaperTrade[]): ExpectancyStats {
  if (trades.length === 0) return emptyExpectancyStats();
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = wins.length / trades.length;
  const avgWin = average(wins.map((t) => t.returnPercent));
  const avgLossAbs = Math.abs(average(losses.map((t) => t.returnPercent)));
  return {
    trades: trades.length,
    wins: wins.length,
    winRate: round2(winRate * 100),
    expectancy: round2(winRate * avgWin - (1 - winRate) * avgLossAbs),
  };
}

export function classifyRegimeText(text: string): string {
  const lower = text.toLowerCase();
  if (/\bbear|\bbearish|risk[- ]?off|weak\s*bear|downtrend/.test(lower)) {
    return "bear";
  }
  if (/\bbull|\bbullish|risk[- ]?on|strong\s*bull|uptrend/.test(lower)) {
    return "bull";
  }
  return "neutral";
}

export function convictionBucketKey(conviction: number): string {
  if (conviction < 55) return "lt-55";
  if (conviction < 60) return "55-60";
  if (conviction < 65) return "60-65";
  if (conviction < 70) return "65-70";
  if (conviction < 75) return "70-75";
  if (conviction < 80) return "75-80";
  if (conviction < 90) return "80-90";
  return "90-100";
}

export function resolveSector(symbol: string): string {
  return lookupCompanyRegistry(symbol)?.sector?.trim() || "Unclassified";
}

export function liquidityBucketFromText(evidence: string, reasons: string): string {
  const text = `${evidence} ${reasons}`.toLowerCase();
  if (/low\s*liquidity|illiquid|thin\s*book/.test(text)) return "low";
  if (/high\s*liquidity|liquid\s*name|volume\s*surge|rvol/.test(text)) {
    return "high";
  }
  return "unknown";
}

export function mapRecommendationToPaperStrategy(
  recommendation: SharedRecommendation
): PaperStrategy {
  const id = `${recommendation.primaryStrategyId} ${recommendation.category}`.toLowerCase();
  if (/scalp/.test(id)) return "scalping";
  if (/intraday|btst|opening|vwap|orb/.test(id)) return "intraday";
  return "swing";
}

function groupKey(
  trade: PaperTrade,
  dimension: "strategy" | "sector" | "regime" | "conviction" | "liquidity"
): string {
  switch (dimension) {
    case "strategy":
      return trade.strategy;
    case "sector":
      return resolveSector(trade.symbol);
    case "regime":
      return classifyRegimeText(
        `${trade.recommendation.marketRegime} ${trade.recommendation.marketContext}`
      );
    case "conviction":
      return convictionBucketKey(
        Math.max(trade.conviction, trade.confidence)
      );
    case "liquidity":
      return liquidityBucketFromText(
        trade.recommendation.evidence.join(" "),
        trade.recommendation.reasons.join(" ")
      );
  }
}

function buildMap(
  trades: PaperTrade[],
  dimension: "strategy" | "sector" | "regime" | "conviction" | "liquidity"
): Map<string, ExpectancyStats> {
  const buckets = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    const key = groupKey(trade, dimension);
    const list = buckets.get(key) ?? [];
    list.push(trade);
    buckets.set(key, list);
  }
  const out = new Map<string, ExpectancyStats>();
  for (const [key, list] of buckets) {
    out.set(key, computeStats(list));
  }
  return out;
}

/**
 * Build expectancy tables from closed paper trades only.
 * If asOf is set, exclude trades whose exitAt is after asOf (no future leakage).
 */
export function buildHistoricalExpectancyTables(
  trades: readonly PaperTrade[] = loadPaperTradingState().trades,
  asOf?: string | null
): HistoricalExpectancyTables {
  const asOfMs = asOf ? Date.parse(asOf) : Number.POSITIVE_INFINITY;
  const closed = trades.filter((trade) => {
    if (!isTradeClosed(trade)) return false;
    const exitMs = Date.parse(trade.exitAt ?? trade.updatedAt);
    if (!Number.isFinite(exitMs)) return false;
    return exitMs <= asOfMs;
  });

  return {
    overall: computeStats(closed),
    byStrategy: buildMap(closed, "strategy"),
    bySector: buildMap(closed, "sector"),
    byRegime: buildMap(closed, "regime"),
    byConviction: buildMap(closed, "conviction"),
    byLiquidity: buildMap(closed, "liquidity"),
    closedTradesUsed: closed.length,
  };
}

export function lookupExpectancy(
  tables: HistoricalExpectancyTables,
  dimension: keyof Pick<
    HistoricalExpectancyTables,
    "byStrategy" | "bySector" | "byRegime" | "byConviction" | "byLiquidity"
  >,
  key: string
): ExpectancyStats {
  return tables[dimension].get(key) ?? emptyExpectancyStats();
}
