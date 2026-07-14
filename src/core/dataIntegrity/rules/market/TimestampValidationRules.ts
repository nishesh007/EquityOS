/**
 * Institutional timestamp validation rules for market data.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  configFromContext,
  marketFail,
  marketPass,
  readTimestamp,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createTimestampValidationRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "timestamp.ascending",
      name: "Ascending Timestamps",
      description: "Market series timestamps must be strictly ascending.",
      category: "HISTORICAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "timestamp"],
      author: "equityos-market",
      datasetTypes: [
        "OHLC_CANDLE",
        "INTRADAY_CANDLE",
        "HISTORICAL_DATASET",
        "BACKTEST_DATASET",
      ],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        let prev: number | null = null;
        for (let i = 0; i < rows.length; i++) {
          const ts = readTimestamp(rows[i]);
          if (ts === null) continue;
          if (prev !== null && ts < prev) {
            return marketFail({
              message: `Timestamp not ascending at index ${i}.`,
              recommendation: "Sort candles by timestamp before ingestion.",
              path: `[${i}].timestamp`,
              expected: `>= ${prev}`,
              actual: ts,
            });
          }
          prev = ts;
        }
        return marketPass();
      },
    },
    {
      id: "timestamp.no_duplicates",
      name: "No Duplicate Timestamps",
      description: "Reject duplicate timestamps in a series.",
      category: "HISTORICAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "timestamp"],
      author: "equityos-market",
      datasetTypes: [
        "OHLC_CANDLE",
        "INTRADAY_CANDLE",
        "HISTORICAL_DATASET",
        "BACKTEST_DATASET",
      ],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        const seen = new Set<number>();
        for (let i = 0; i < rows.length; i++) {
          const ts = readTimestamp(rows[i]);
          if (ts === null) continue;
          if (seen.has(ts)) {
            return marketFail({
              message: `Duplicate timestamp at index ${i}.`,
              recommendation: "Deduplicate candles on timestamp key.",
              path: `[${i}].timestamp`,
              expected: "unique",
              actual: ts,
            });
          }
          seen.add(ts);
        }
        return marketPass();
      },
    },
    {
      id: "timestamp.not_future",
      name: "No Future Timestamps",
      description: "Reject timestamps far in the future.",
      category: "HISTORICAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "timestamp"],
      author: "equityos-market",
      datasetTypes: [
        "STOCK_QUOTE",
        "OHLC_CANDLE",
        "INTRADAY_CANDLE",
        "HISTORICAL_DATASET",
      ],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const now = Date.now() + config.futureTimestampSkewMs;
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const ts = readTimestamp(rows[i]);
          if (ts !== null && ts > now) {
            return marketFail({
              message: `Future timestamp at index ${i}.`,
              recommendation: "Check provider clock/timezone conversion.",
              path: `[${i}].timestamp`,
              expected: `<= ${now}`,
              actual: ts,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "timestamp.weekend",
      name: "Weekend Candle Consistency",
      description: "Warn/reject weekend candles unless configured.",
      category: "HISTORICAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "timestamp", "session"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "STOCK_QUOTE"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        if (config.allowWeekendCandles || ctx.metadata?.allowWeekend) {
          return marketPass();
        }
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const ts = readTimestamp(rows[i]);
          if (ts === null) continue;
          const day = new Date(ts).getUTCDay();
          if (day === 0 || day === 6) {
            return marketFail({
              message: `Weekend timestamp at index ${i}.`,
              recommendation:
                "Filter weekend bars or enable allowWeekendCandles for the venue.",
              path: `[${i}].timestamp`,
              expected: "weekday session",
              actual: ts,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "timestamp.missing_intervals",
      name: "Missing Interval Detection",
      description: "Detect missing intervals in uniform intraday series.",
      category: "HISTORICAL",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["market", "timestamp", "gap"],
      author: "equityos-market",
      datasetTypes: ["INTRADAY_CANDLE", "OHLC_CANDLE"],
      validate: (ctx) => {
        const intervalMinutes = Number(
          ctx.metadata?.intervalMinutes ?? ctx.metadata?.interval ?? 0
        );
        if (!intervalMinutes || intervalMinutes <= 0) return marketPass();
        const step = intervalMinutes * 60_000;
        const rows = asRows(ctx.data);
        const times = rows
          .map(readTimestamp)
          .filter((t): t is number => t !== null)
          .sort((a, b) => a - b);
        for (let i = 1; i < times.length; i++) {
          const delta = times[i] - times[i - 1];
          if (delta > step * 1.5 && delta < step * 10) {
            return marketFail({
              message: `Missing interval detected between candles (${delta}ms gap).`,
              recommendation:
                "Backfill missing bars or mark series as incomplete.",
              field: "timestamp",
              expected: step,
              actual: delta,
            });
          }
        }
        return marketPass();
      },
    },
  ];
}
