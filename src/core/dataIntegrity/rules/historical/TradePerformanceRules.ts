/**
 * Trade lifecycle historical performance validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asArray,
  isPlainObject,
  metricsSection,
  readNumber,
  readString,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

const TERMINAL_STATUSES = [
  "TARGET_HIT",
  "STOP_HIT",
  "PARTIAL_TARGET_HIT",
  "TIME_EXPIRED",
  "EXPIRED",
  "CANCELLED",
  "MANUAL_EXIT",
  "ENTRY_FILLED",
] as const;

export function createTradePerformanceRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.trade.lifecycle_status",
      name: "Trade Lifecycle Status Valid",
      description: "Trade outcomes must use supported lifecycle statuses.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "trade"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const status = readString(ctx.data, [
          "tradeStatus",
          "status",
          "outcome",
        ]);
        if (!status) {
          const trades = asArray(ctx.data.trades);
          if (trades.length === 0) return histPass();
          for (const t of trades) {
            if (!isPlainObject(t)) continue;
            const s = readString(t, ["status", "outcome", "lifecycle"]);
            if (
              s &&
              !TERMINAL_STATUSES.includes(
                s.toUpperCase().replace(/[\s-]+/g, "_") as (typeof TERMINAL_STATUSES)[number]
              )
            ) {
              return histFail({
                field: "status",
                message: `Unsupported trade lifecycle status: ${s}.`,
                recommendation: `Use one of: ${TERMINAL_STATUSES.join(", ")}.`,
                actual: s,
              });
            }
          }
          return histPass();
        }
        const normalized = status.toUpperCase().replace(/[\s-]+/g, "_");
        if (
          !TERMINAL_STATUSES.includes(
            normalized as (typeof TERMINAL_STATUSES)[number]
          )
        ) {
          return histFail({
            field: "status",
            message: `Unsupported trade lifecycle status: ${status}.`,
            recommendation: `Use one of: ${TERMINAL_STATUSES.join(", ")}.`,
            actual: status,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.trade.outcome_counts",
      name: "Trade Outcome Counts Coherent",
      description: "Target/stop/expired/cancelled counts must not exceed total trades.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "trade"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const total =
          readNumber(src, ["totalTrades", "tradesAnalysed", "sampleSize"]) ??
          asArray(ctx.data.trades).length;
        if (!total) return histPass();
        const parts = [
          readNumber(src, ["targetHitCount", "targetsHit"]) ?? 0,
          readNumber(src, ["stopHitCount", "stopsHit"]) ?? 0,
          readNumber(src, ["expiredCount", "timeExpiredCount"]) ?? 0,
          readNumber(src, ["cancelledCount"]) ?? 0,
          readNumber(src, ["manualExitCount"]) ?? 0,
          readNumber(src, ["partialTargetHitCount"]) ?? 0,
        ];
        const sum = parts.reduce((a, b) => a + b, 0);
        if (sum > total + 1e-9) {
          return histFail({
            field: "totalTrades",
            message: "Outcome counts exceed total trades.",
            recommendation: "Reconcile lifecycle outcome tallies.",
            expected: `sum(outcomes) <= ${total}`,
            actual: { total, sum, parts },
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.trade.entry_filled_tracking",
      name: "Entry Filled Tracking",
      description: "Filled entries should be tracked when trade history is present.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["historical", "trade"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const trades = asArray(ctx.data.trades);
        const m = metricsSection(ctx.data);
        const filled = readNumber({ ...ctx.data, ...m }, [
          "entryFilledCount",
          "filledCount",
        ]);
        if (trades.length > 0 && filled === undefined && ctx.data.trackFills !== false) {
          return histFail({
            field: "entryFilledCount",
            message: "Trade list present but entry fill count missing.",
            recommendation: "Track ENTRY_FILLED counts in metrics.",
            actual: null,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.trade.winning_losing_balance",
      name: "Winning And Losing Trade Balance",
      description: "Win/loss counts must be consistent with totals.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["historical", "trade"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const m = metricsSection(ctx.data);
        const src = { ...ctx.data, ...m };
        const wins = readNumber(src, ["winningTrades", "wins"]);
        const losses = readNumber(src, ["losingTrades", "losses"]);
        const total = readNumber(src, ["totalTrades", "sampleSize"]);
        if (wins === undefined || losses === undefined || total === undefined) {
          return histPass();
        }
        if (wins + losses > total + 1e-9) {
          return histFail({
            field: "winningTrades",
            message: "Wins + losses exceed total trades.",
            recommendation: "Reconcile win/loss classification.",
            expected: `wins+losses <= ${total}`,
            actual: { wins, losses, total },
          });
        }
        return histPass();
      },
    },
  ];
}
