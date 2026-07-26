import type { StrategyPerformanceRow, ValidationTradeRecord } from "@/lib/backtesting/validation/types";
import {
  averageRiskReward,
  estimateCagr,
  sharpeRatio,
  sortinoRatio,
  toStats,
  totalReturnPercent,
} from "@/lib/backtesting/validation/metrics";

type Dimension = StrategyPerformanceRow["dimension"];

function groupKey(
  trade: ValidationTradeRecord,
  dimension: Dimension
): { key: string; label: string } {
  switch (dimension) {
    case "strategy":
      return { key: trade.strategyId, label: trade.strategyLabel };
    case "sector":
      return { key: trade.sector, label: trade.sector };
    case "market_cap":
      return {
        key: trade.marketCap,
        label:
          trade.marketCap === "unknown"
            ? "Unknown"
            : trade.marketCap[0].toUpperCase() + trade.marketCap.slice(1),
      };
    case "market_regime":
      return { key: trade.marketRegime, label: trade.marketRegime };
    case "universe":
      return { key: trade.universeLabel, label: trade.universeLabel };
    case "symbol":
      return { key: trade.symbol, label: trade.symbol };
  }
}

export function compareByDimension(
  trades: readonly ValidationTradeRecord[],
  dimension: Dimension
): StrategyPerformanceRow[] {
  const groups = new Map<string, ValidationTradeRecord[]>();
  const labels = new Map<string, string>();

  for (const trade of trades) {
    const { key, label } = groupKey(trade, dimension);
    labels.set(key, label);
    const list = groups.get(key) ?? [];
    list.push(trade);
    groups.set(key, list);
  }

  const rows: StrategyPerformanceRow[] = [];
  for (const [key, group] of groups) {
    const statistics = toStats(group);
    rows.push({
      key,
      label: labels.get(key) ?? key,
      dimension,
      tradeCount: group.filter((t) => t.status === "closed").length,
      statistics,
      totalReturn: totalReturnPercent(group),
      cagr: estimateCagr(group),
      averageHoldingMs: statistics.averageHoldingMs,
      averageRiskReward: averageRiskReward(group),
      sharpeRatio: sharpeRatio(group),
      sortinoRatio: sortinoRatio(group),
    });
  }

  return rows.sort((a, b) => b.totalReturn - a.totalReturn);
}
