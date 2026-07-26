import { percentOf, roundMetric } from "@/lib/analytics";
import {
  FAILURE_CATEGORY_LABELS,
  type FailureAnalysisResult,
  type FailureCategory,
  type ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";
import { closedTradesOnly } from "@/lib/backtesting/validation/metrics";

export function classifyTradeFailures(
  trade: ValidationTradeRecord
): FailureCategory[] {
  if (trade.status !== "closed" || trade.returnPercent >= 0) return [];

  const categories: FailureCategory[] = [];

  if (trade.entryTimingBps != null && trade.entryTimingBps > 35) {
    categories.push("late_entry");
  }
  if (trade.hitStopLoss && (trade.holdingMs ?? 0) < 2 * 86_400_000) {
    categories.push("false_breakout");
  }
  if (
    trade.marketRegime === "volatile" ||
    trade.marketRegime === "bear" ||
    trade.marketRegime === "choppy"
  ) {
    categories.push("weak_trend");
  }
  if (trade.failureCategories.includes("earnings_impact")) {
    categories.push("earnings_impact");
  }
  if (trade.failureCategories.includes("macro_event")) {
    categories.push("macro_event");
  }
  if (trade.failureCategories.includes("low_liquidity")) {
    categories.push("low_liquidity");
  }
  if (trade.stopDistancePct != null && trade.stopDistancePct < 1.2) {
    categories.push("tight_stop");
  }
  if (
    trade.plannedRiskReward != null &&
    trade.plannedRiskReward > 3.5 &&
    !trade.hitTarget
  ) {
    categories.push("aggressive_target");
  }
  if (
    trade.marketRegime === "volatile" ||
    trade.failureCategories.includes("high_volatility")
  ) {
    categories.push("high_volatility");
  }

  // Ensure every loser has at least one category.
  if (categories.length === 0) {
    categories.push("weak_trend");
  }

  return [...new Set(categories)];
}

export function buildFailureAnalysis(
  trades: readonly ValidationTradeRecord[]
): FailureAnalysisResult {
  const losers = closedTradesOnly(trades).filter((t) => t.returnPercent < 0);
  const counts = new Map<FailureCategory, number>();

  for (const trade of losers) {
    const cats = classifyTradeFailures(trade);
    for (const cat of cats) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }

  const totalTags = [...counts.values()].reduce((a, b) => a + b, 0);
  const rows = [...counts.entries()]
    .map(([category, count]) => ({
      category,
      label: FAILURE_CATEGORY_LABELS[category],
      count,
      sharePct: roundMetric(percentOf(count, Math.max(totalTags, 1)), 1),
    }))
    .sort((a, b) => b.count - a.count);

  const top = rows.slice(0, 3).map((r) => r.label);
  const summary =
    losers.length === 0
      ? "No losing trades in the filtered sample."
      : `Across ${losers.length} losing trade${losers.length === 1 ? "" : "s"}, leading failure tags: ${top.join(", ") || "n/a"}.`;

  return { losingTrades: losers.length, rows, summary };
}
