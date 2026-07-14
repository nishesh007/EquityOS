/**
 * Institutional OHLC / candle validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  configFromContext,
  isPlainObject,
  marketFail,
  marketPass,
  readNumber,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

function readOhlc(row: Record<string, unknown>) {
  return {
    open: readNumber(row, ["open", "o"]),
    high: readNumber(row, ["high", "h"]),
    low: readNumber(row, ["low", "l"]),
    close: readNumber(row, ["close", "c"]),
  };
}

export function createOHLCValidationRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ohlc.relationships",
      name: "OHLC Relationships",
      description:
        "High >= Open/Close/Low; Low <= Open/Close; Open/Close within High/Low.",
      category: "OHLC",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["market", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const { open, high, low, close } = readOhlc(rows[i]);
          if (
            open === undefined ||
            high === undefined ||
            low === undefined ||
            close === undefined
          ) {
            continue;
          }
          if (!(high >= low)) {
            return marketFail({
              message: `High must be >= Low at index ${i}.`,
              recommendation: "Reject malformed candle and re-pull OHLC.",
              path: `[${i}]`,
              expected: "high >= low",
              actual: { open, high, low, close },
            });
          }
          if (!(high >= open && high >= close)) {
            return marketFail({
              message: `High must be >= Open and Close at index ${i}.`,
              recommendation: "Reject malformed candle and re-pull OHLC.",
              path: `[${i}]`,
              expected: "high >= open && high >= close",
              actual: { open, high, low, close },
            });
          }
          if (!(low <= open && low <= close)) {
            return marketFail({
              message: `Low must be <= Open and Close at index ${i}.`,
              recommendation: "Reject malformed candle and re-pull OHLC.",
              path: `[${i}]`,
              expected: "low <= open && low <= close",
              actual: { open, high, low, close },
            });
          }
          if (open > high || open < low) {
            return marketFail({
              message: `Open outside High/Low range at index ${i}.`,
              recommendation: "Reject malformed candle and re-pull OHLC.",
              field: "open",
              path: `[${i}].open`,
              expected: "low <= open <= high",
              actual: { open, high, low },
            });
          }
          if (close > high || close < low) {
            return marketFail({
              message: `Close outside High/Low range at index ${i}.`,
              recommendation: "Reject malformed candle and re-pull OHLC.",
              field: "close",
              path: `[${i}].close`,
              expected: "low <= close <= high",
              actual: { close, high, low },
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "ohlc.non_negative",
      name: "OHLC Non-Negative Finite",
      description: "OHLC values must be finite, non-NaN, and non-negative.",
      category: "OHLC",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["market", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          for (const field of ["open", "high", "low", "close"] as const) {
            const raw = rows[i][field] ?? rows[i][field[0]];
            if (raw === undefined || raw === null) continue;
            if (typeof raw === "number" && Number.isNaN(raw)) {
              return marketFail({
                message: `OHLC ${field} is NaN at index ${i}.`,
                recommendation: "Discard candle with NaN OHLC.",
                field,
                path: `[${i}].${field}`,
                expected: "finite number",
                actual: raw,
              });
            }
            const num = readNumber(rows[i], [field, field[0]]);
            if (num === undefined) continue;
            if (!Number.isFinite(num) || num < 0) {
              return marketFail({
                message: `OHLC ${field} invalid at index ${i}.`,
                recommendation: "Discard candle with negative/infinite OHLC.",
                field,
                path: `[${i}].${field}`,
                expected: "finite >= 0",
                actual: num,
              });
            }
          }
        }
        return marketPass();
      },
    },
    {
      id: "ohlc.body_range",
      name: "Body And Range Calculation",
      description: "Candle body and range must be consistent with OHLC.",
      category: "OHLC",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const { open, high, low, close } = readOhlc(rows[i]);
          if (
            open === undefined ||
            high === undefined ||
            low === undefined ||
            close === undefined
          ) {
            continue;
          }
          const expectedBody = Math.abs(close - open);
          const expectedRange = high - low;
          const body = readNumber(rows[i], ["body", "candleBody"]);
          const range = readNumber(rows[i], ["range", "candleRange"]);
          if (body !== undefined && Math.abs(body - expectedBody) > 1e-6) {
            return marketFail({
              message: `Body calculation mismatch at index ${i}.`,
              recommendation: "Recompute body as abs(close - open).",
              field: "body",
              expected: expectedBody,
              actual: body,
            });
          }
          if (range !== undefined && Math.abs(range - expectedRange) > 1e-6) {
            return marketFail({
              message: `Range calculation mismatch at index ${i}.`,
              recommendation: "Recompute range as high - low.",
              field: "range",
              expected: expectedRange,
              actual: range,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "ohlc.candle_interval",
      name: "Candle Interval Valid",
      description:
        "Reject malformed candles / unsupported intervals (1m–240m, daily, weekly, monthly).",
      category: "OHLC",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "ohlc", "interval"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const checkInterval = (
          row: Record<string, unknown>,
          path: string
        ): ReturnType<typeof marketFail> | null => {
          const interval =
            row.interval ??
            row.timeframe ??
            row.resolution ??
            ctx.metadata?.interval;
          if (interval === undefined || interval === null) return null;

          let minutes: number | null = null;
          if (typeof interval === "number") minutes = interval;
          else if (typeof interval === "string") {
            const normalized = interval.trim().toUpperCase();
            if (normalized === "D" || normalized === "1D" || normalized === "DAILY") {
              minutes = 1440;
            } else if (
              normalized === "W" ||
              normalized === "1W" ||
              normalized === "WEEKLY"
            ) {
              minutes = 10080;
            } else if (
              normalized === "M" ||
              normalized === "1M" ||
              normalized === "1MO" ||
              normalized === "MONTHLY"
            ) {
              // Prefer monthly for equity OHLC libraries unless marked intraday
              minutes =
                ctx.datasetType === "INTRADAY_CANDLE" &&
                (normalized === "M" || normalized === "1M")
                  ? 1
                  : 43200;
            } else {
              const match = normalized.match(/^(\d+)M?$/);
              if (match) minutes = Number(match[1]);
            }
          }

          if (
            minutes === null ||
            !config.supportedIntervalsMinutes.includes(minutes)
          ) {
            return marketFail({
              message: `Unsupported or malformed candle interval at ${path}.`,
              recommendation:
                "Use supported intervals: 1,3,5,10,15,30,45,60,120,240,daily,weekly,monthly.",
              field: "interval",
              path,
              expected: config.supportedIntervalsMinutes,
              actual: interval,
            });
          }
          return null;
        };

        if (isPlainObject(ctx.data)) {
          const fail = checkInterval(ctx.data, "$");
          if (fail) return fail;
        }
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const fail = checkInterval(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return marketPass();
      },
    },
  ];
}
