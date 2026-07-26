/**
 * Paper Trading Lab — Institutional Performance Analytics (Sprint 11E.2).
 * Consumes paper-trade history only. Never creates or modifies trades.
 */

import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";
import { isTradeClosed, isTradeOpen } from "@/lib/paper-trading/kpis";
import type {
  ConvictionBandId,
  ConvictionBandStats,
  EquityCurvePoint,
  EquityCurveRange,
  MonthlyPerformanceRow,
  PaperAnalyticsDashboardModel,
  PaperAnalyticsTab,
  PaperExecutiveKpis,
  PaperStrategyComparisonRow,
  PaperTabPerformanceMetrics,
  RecommendationValidationStats,
} from "@/lib/paper-trading/analytics-types";

const STRATEGIES: PaperStrategy[] = ["intraday", "scalping", "swing"];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function closedTrades(trades: readonly PaperTrade[]): PaperTrade[] {
  return trades.filter(isTradeClosed);
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return round1((count / total) * 100);
}

function sortClosedChronological(trades: readonly PaperTrade[]): PaperTrade[] {
  return closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        Date.parse(a.exitAt ?? a.updatedAt) - Date.parse(b.exitAt ?? b.updatedAt)
    );
}

export function computeMaximumDrawdown(
  closedSorted: readonly PaperTrade[]
): number {
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const trade of closedSorted) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }
  return round2(maxDd);
}

function profitFactor(closed: readonly PaperTrade[]): number {
  const wins = closed.filter((t) => t.pnl > 0).map((t) => t.pnl);
  const losses = closed.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
  const grossProfit = wins.reduce((s, v) => s + v, 0);
  const grossLoss = losses.reduce((s, v) => s + v, 0);
  if (grossLoss === 0) return grossProfit > 0 ? 99.99 : 0;
  return round2(grossProfit / grossLoss);
}

function exitPercents(closed: readonly PaperTrade[]) {
  const n = closed.length;
  const target1 = closed.filter(
    (t) =>
      t.exitReason === "target_1" ||
      t.exitReason === "target_2" ||
      t.exitReason === "target_3" ||
      t.status === "target_1_hit" ||
      t.status === "target_2_hit" ||
      t.status === "target_3_hit"
  ).length;
  const target2 = closed.filter(
    (t) =>
      t.exitReason === "target_2" ||
      t.exitReason === "target_3" ||
      t.status === "target_2_hit" ||
      t.status === "target_3_hit"
  ).length;
  const target3 = closed.filter(
    (t) => t.exitReason === "target_3" || t.status === "target_3_hit"
  ).length;
  const stopLoss = closed.filter(
    (t) => t.exitReason === "stop_loss" || t.status === "stop_loss_hit"
  ).length;
  return {
    target1HitPercent: percentOf(target1, n),
    target2HitPercent: percentOf(target2, n),
    target3HitPercent: percentOf(target3, n),
    stopLossPercent: percentOf(stopLoss, n),
  };
}

function strategyScore(row: PaperStrategyComparisonRow): number {
  // Rank strategies by win rate then net-quality proxy (avg return * profit factor)
  return row.winRate * 10 + row.averageReturn + row.profitFactor;
}

export function computeStrategyComparisonRow(
  trades: readonly PaperTrade[],
  strategy: PaperStrategy
): PaperStrategyComparisonRow {
  const scoped = trades.filter((t) => t.strategy === strategy);
  const open = scoped.filter(isTradeOpen);
  const closed = closedTrades(scoped);
  const wins = closed.filter((t) => t.pnl > 0);
  const gains = wins.map((t) => t.pnl);
  const losses = closed.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
  const exits = exitPercents(closed);

  return {
    strategy,
    totalTrades: scoped.length,
    winRate: percentOf(wins.length, closed.length),
    averageReturn:
      closed.length === 0
        ? 0
        : round2(average(closed.map((t) => t.returnPercent))),
    averageGain: gains.length === 0 ? 0 : round2(average(gains)),
    averageLoss: losses.length === 0 ? 0 : round2(average(losses)),
    profitFactor: profitFactor(closed),
    maximumDrawdown: computeMaximumDrawdown(sortClosedChronological(scoped)),
    averageHoldingMs:
      closed.length === 0
        ? 0
        : Math.round(average(closed.map((t) => t.holdingMs))),
    ...exits,
    openTrades: open.length,
    closedTrades: closed.length,
  };
}

export function computeStrategyComparison(
  trades: readonly PaperTrade[]
): PaperStrategyComparisonRow[] {
  return STRATEGIES.map((s) => computeStrategyComparisonRow(trades, s));
}

export function computeExecutiveKpis(
  trades: readonly PaperTrade[],
  lastUpdated: string | null
): PaperExecutiveKpis {
  const open = trades.filter(isTradeOpen);
  const closed = closedTrades(trades);
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const comparison = computeStrategyComparison(trades).filter(
    (row) => row.totalTrades > 0
  );

  let bestStrategy: PaperStrategy | null = null;
  let worstStrategy: PaperStrategy | null = null;
  if (comparison.length > 0) {
    const ranked = [...comparison].sort(
      (a, b) => strategyScore(b) - strategyScore(a)
    );
    bestStrategy = ranked[0].strategy;
    worstStrategy = ranked[ranked.length - 1].strategy;
  }

  return {
    totalTrades: trades.length,
    openPositions: open.length,
    closedPositions: closed.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    overallWinRate: percentOf(wins.length, closed.length),
    netVirtualPnl: round2(trades.reduce((s, t) => s + t.pnl, 0)),
    averageReturn:
      closed.length === 0
        ? 0
        : round2(average(closed.map((t) => t.returnPercent))),
    averageHoldingMs:
      closed.length === 0
        ? 0
        : Math.round(average(closed.map((t) => t.holdingMs))),
    profitFactor: profitFactor(closed),
    maximumDrawdown: computeMaximumDrawdown(sortClosedChronological(trades)),
    bestStrategy,
    worstStrategy,
    lastUpdated,
  };
}

export function computeTabPerformanceMetrics(
  trades: readonly PaperTrade[],
  strategy: PaperAnalyticsTab
): PaperTabPerformanceMetrics {
  const scoped =
    strategy === "overview"
      ? trades
      : trades.filter((t) => t.strategy === strategy);
  const closed = closedTrades(scoped);
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const gains = wins.map((t) => t.pnl);
  const lossPnls = losses.map((t) => t.pnl);

  return {
    strategy,
    totalTrades: scoped.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winPercent: percentOf(wins.length, closed.length),
    averageGain: gains.length === 0 ? 0 : round2(average(gains)),
    averageLoss:
      lossPnls.length === 0 ? 0 : round2(average(lossPnls.map(Math.abs))),
    largestWinner: gains.length === 0 ? 0 : round2(Math.max(...gains)),
    largestLoser:
      lossPnls.length === 0 ? 0 : round2(Math.min(...lossPnls)),
    averageHoldingMs:
      closed.length === 0
        ? 0
        : Math.round(average(closed.map((t) => t.holdingMs))),
    averageRiskReward:
      scoped.length === 0
        ? 0
        : round2(average(scoped.map((t) => t.riskReward))),
    averageConviction:
      scoped.length === 0
        ? 0
        : round2(average(scoped.map((t) => t.conviction))),
  };
}

function bucketKey(iso: string, range: EquityCurveRange): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  if (range === "daily") return `${y}-${m}-${day}`;
  if (range === "monthly") return `${y}-${m}`;
  if (range === "weekly") {
    const tmp = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
    );
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return iso;
}

function bucketLabel(key: string, range: EquityCurveRange): string {
  if (range === "all") {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(key));
    } catch {
      return key.slice(0, 16);
    }
  }
  if (range === "monthly") {
    const [y, m] = key.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[Number(m) - 1] ?? m} ${y}`;
  }
  return key;
}

/**
 * Equity / period P&L series from closed trades.
 * All Time = cumulative per trade; Daily/Weekly/Monthly = period P&L + running equity.
 */
export function buildEquityCurve(
  trades: readonly PaperTrade[],
  range: EquityCurveRange = "all"
): EquityCurvePoint[] {
  const closed = sortClosedChronological(trades);
  if (closed.length === 0) return [];

  let equity = 0;
  if (range === "all") {
    return closed.map((trade) => {
      equity += trade.pnl;
      const ts = trade.exitAt ?? trade.updatedAt;
      return {
        timestamp: ts,
        label: bucketLabel(ts, "all"),
        equity: round2(equity),
        periodPnl: round2(trade.pnl),
        tradeId: trade.id,
      };
    });
  }

  const buckets = new Map<
    string,
    { timestamp: string; periodPnl: number; equity: number }
  >();
  for (const trade of closed) {
    equity += trade.pnl;
    const ts = trade.exitAt ?? trade.updatedAt;
    const key = bucketKey(ts, range);
    const prev = buckets.get(key);
    buckets.set(key, {
      timestamp: ts,
      periodPnl: round2((prev?.periodPnl ?? 0) + trade.pnl),
      equity: round2(equity),
    });
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    timestamp: value.timestamp,
    label: bucketLabel(key, range),
    equity: value.equity,
    periodPnl: value.periodPnl,
  }));
}

export function buildMonthlyPerformance(
  trades: readonly PaperTrade[]
): MonthlyPerformanceRow[] {
  const closed = closedTrades(trades);
  const byMonth = new Map<string, PaperTrade[]>();

  for (const trade of closed) {
    const ts = trade.exitAt ?? trade.updatedAt;
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const list = byMonth.get(key) ?? [];
    list.push(trade);
    byMonth.set(key, list);
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthTrades]) => {
      const wins = monthTrades.filter((t) => t.pnl > 0);
      const returns = monthTrades.map((t) => t.returnPercent);
      const pnls = monthTrades.map((t) => t.pnl);
      const [y, m] = monthKey.split("-");
      return {
        monthKey,
        monthLabel: `${monthNames[Number(m) - 1] ?? m} ${y}`,
        trades: monthTrades.length,
        winRate: percentOf(wins.length, monthTrades.length),
        netReturn: round2(pnls.reduce((s, v) => s + v, 0)),
        averageReturn: round2(average(returns)),
        bestTrade: pnls.length === 0 ? 0 : round2(Math.max(...pnls)),
        worstTrade: pnls.length === 0 ? 0 : round2(Math.min(...pnls)),
      };
    });
}

const CONVICTION_BANDS: Array<{
  id: ConvictionBandId;
  label: string;
  min: number;
  max: number;
}> = [
  { id: "70-80", label: "70–80%", min: 70, max: 80 },
  { id: "80-85", label: "80–85%", min: 80, max: 85 },
  { id: "85-90", label: "85–90%", min: 85, max: 90 },
  { id: "90-95", label: "90–95%", min: 90, max: 95 },
  { id: "95+", label: "95%+", min: 95, max: Infinity },
];

function bandForConviction(conviction: number): ConvictionBandId | null {
  if (conviction < 70) return null;
  for (const band of CONVICTION_BANDS) {
    if (conviction >= band.min && conviction < band.max) return band.id;
    if (band.max === Infinity && conviction >= band.min) return band.id;
  }
  return null;
}

export function computeRecommendationValidation(
  trades: readonly PaperTrade[],
  testedRecommendationIds: readonly string[]
): RecommendationValidationStats {
  const closed = closedTrades(trades);
  const executedIds = new Set(
    trades.map((t) => t.recommendation.recommendationId)
  );
  const generated = Math.max(
    testedRecommendationIds.length,
    executedIds.size
  );
  const executed = executedIds.size;
  const expired = closed.filter(
    (t) =>
      t.exitReason === "recommendation_expired" || t.status === "expired"
  ).length;
  const cancelled = closed.filter(
    (t) =>
      t.exitReason === "market_close" || t.exitReason === "session_end"
  ).length;
  const wins = closed.filter((t) => t.pnl > 0);

  const bands: ConvictionBandStats[] = CONVICTION_BANDS.map((band) => {
    const inBand = closed.filter((t) => {
      const id = bandForConviction(t.conviction);
      return id === band.id;
    });
    const bandWins = inBand.filter((t) => t.pnl > 0);
    return {
      band: band.id,
      label: band.label,
      trades: inBand.length,
      winRate: percentOf(bandWins.length, inBand.length),
      averageReturn:
        inBand.length === 0
          ? 0
          : round2(average(inBand.map((t) => t.returnPercent))),
    };
  });

  return {
    recommendationsGenerated: generated,
    recommendationsExecuted: executed,
    recommendationsExpired: expired,
    recommendationsCancelled: cancelled,
    executionSuccessPercent: percentOf(wins.length, closed.length),
    averageConviction:
      trades.length === 0
        ? 0
        : round2(average(trades.map((t) => t.conviction))),
    averageReturnByConviction:
      closed.length === 0
        ? 0
        : round2(average(closed.map((t) => t.returnPercent))),
    convictionBands: bands,
  };
}

export function selectBestTrades(
  trades: readonly PaperTrade[],
  limit = 5
): PaperTrade[] {
  return closedTrades(trades)
    .slice()
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, limit);
}

export function selectWorstTrades(
  trades: readonly PaperTrade[],
  limit = 5
): PaperTrade[] {
  return closedTrades(trades)
    .slice()
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, limit);
}

export function buildPaperAnalyticsDashboard(
  trades: readonly PaperTrade[],
  options: {
    tab: PaperAnalyticsTab;
    equityRange: EquityCurveRange;
    explorerTrades: readonly PaperTrade[];
    testedRecommendationIds: readonly string[];
    lastUpdated: string | null;
  }
): PaperAnalyticsDashboardModel {
  const scoped =
    options.tab === "overview"
      ? trades
      : trades.filter((t) => t.strategy === options.tab);

  return {
    executive: computeExecutiveKpis(trades, options.lastUpdated),
    comparison: computeStrategyComparison(trades),
    tabMetrics: computeTabPerformanceMetrics(trades, options.tab),
    equityCurve: buildEquityCurve(scoped, options.equityRange),
    monthly: buildMonthlyPerformance(scoped),
    explorerTrades: [...options.explorerTrades],
    validation: computeRecommendationValidation(
      trades,
      options.testedRecommendationIds
    ),
    bestTrades: selectBestTrades(scoped),
    worstTrades: selectWorstTrades(scoped),
  };
}

/** @deprecated Prefer buildPaperAnalyticsDashboard — kept for existing tests. */
export function computePerformanceKpis(trades: readonly PaperTrade[]) {
  const exec = computeExecutiveKpis(trades, null);
  return {
    totalTrades: exec.totalTrades,
    openTrades: exec.openPositions,
    closedTrades: exec.closedPositions,
    winningTrades: exec.winningTrades,
    losingTrades: exec.losingTrades,
    winRate: exec.overallWinRate,
    netVirtualPnl: exec.netVirtualPnl,
    averageReturn: exec.averageReturn,
    averageHoldingMs: exec.averageHoldingMs,
    profitFactor: exec.profitFactor,
    maximumDrawdown: exec.maximumDrawdown,
  };
}

/** @deprecated Prefer computeTabPerformanceMetrics */
export function computeStrategyPerformanceMetrics(
  trades: readonly PaperTrade[],
  strategy: PaperAnalyticsTab
) {
  const tab = computeTabPerformanceMetrics(trades, strategy);
  const scoped =
    strategy === "overview"
      ? trades
      : trades.filter((t) => t.strategy === strategy);
  const closed = closedTrades(scoped);
  const exits = exitPercents(closed);
  return {
    strategy,
    totalTrades: tab.totalTrades,
    winRate: tab.winPercent,
    lossRate: percentOf(tab.losingTrades, closed.length),
    averageGain: tab.averageGain,
    averageLoss: tab.averageLoss,
    largestWinner: tab.largestWinner,
    largestLoser: tab.largestLoser,
    averageHoldingMs: tab.averageHoldingMs,
    ...exits,
    expiredPercent: percentOf(
      closed.filter(
        (t) =>
          t.exitReason === "recommendation_expired" || t.status === "expired"
      ).length,
      closed.length
    ),
  };
}

/** @deprecated Prefer buildPaperAnalyticsDashboard */
export function buildPaperAnalyticsSnapshot(
  trades: readonly PaperTrade[],
  options: { tab: PaperAnalyticsTab; equityRange: EquityCurveRange }
) {
  const model = buildPaperAnalyticsDashboard(trades, {
    ...options,
    explorerTrades: trades,
    testedRecommendationIds: [],
    lastUpdated: null,
  });
  return {
    kpis: computePerformanceKpis(
      options.tab === "overview"
        ? trades
        : trades.filter((t) => t.strategy === options.tab)
    ),
    strategyMetrics: computeStrategyPerformanceMetrics(trades, options.tab),
    equityCurve: model.equityCurve,
    monthly: model.monthly.map((m) => ({
      ...m,
      netPnl: m.netReturn,
    })),
    bestTrades: model.bestTrades,
    worstTrades: model.worstTrades,
  };
}
