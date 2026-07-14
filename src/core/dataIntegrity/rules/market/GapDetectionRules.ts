/**
 * Institutional gap / spike detection rules.
 * Marks suspicious data; rejects only when configured.
 */

import type { CreateRuleInput } from "../RuleTypes";
import type { RuleSeverity } from "../../IntegrityTypes";
import {
  asRows,
  configFromContext,
  marketFail,
  marketPass,
  readNumber,
  readTimestamp,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createGapDetectionRules(
  config: MarketValidationConfig
): CreateRuleInput[] {
  const level: RuleSeverity = config.rejectOnGapDetection ? "ERROR" : "WARNING";

  return [
    {
      id: "gap.overnight",
      name: "Overnight Gap Detection",
      description: "Detect large overnight gaps between sessions.",
      category: "OHLC",
      priority: "MEDIUM",
      ruleLevel: level,
      tags: ["market", "gap"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const rows = asRows(ctx.data);
        for (let i = 1; i < rows.length; i++) {
          const prevClose = readNumber(rows[i - 1], ["close", "c"]);
          const open = readNumber(rows[i], ["open", "o"]);
          const prevTs = readTimestamp(rows[i - 1]);
          const ts = readTimestamp(rows[i]);
          if (prevClose === undefined || open === undefined || prevClose <= 0) {
            continue;
          }
          const gapPct = (Math.abs(open - prevClose) / prevClose) * 100;
          const overnight =
            prevTs !== null &&
            ts !== null &&
            ts - prevTs >= 12 * 60 * 60 * 1000;
          if (overnight && gapPct > config.maxOvernightGapPct) {
            return marketFail({
              message: `Large overnight gap of ${gapPct.toFixed(2)}% at index ${i}.`,
              recommendation: config.rejectOnGapDetection
                ? "Reject series pending analyst review."
                : "Mark candle as suspicious; continue with warning.",
              path: `[${i}]`,
              expected: `<= ${config.maxOvernightGapPct}%`,
              actual: gapPct,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "gap.intraday",
      name: "Intraday Gap Detection",
      description: "Detect abnormal intraday gaps between consecutive bars.",
      category: "OHLC",
      priority: "MEDIUM",
      ruleLevel: level,
      tags: ["market", "gap", "intraday"],
      author: "equityos-market",
      datasetTypes: ["INTRADAY_CANDLE", "OHLC_CANDLE"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const rows = asRows(ctx.data);
        for (let i = 1; i < rows.length; i++) {
          const prevClose = readNumber(rows[i - 1], ["close", "c"]);
          const open = readNumber(rows[i], ["open", "o"]);
          const prevTs = readTimestamp(rows[i - 1]);
          const ts = readTimestamp(rows[i]);
          if (prevClose === undefined || open === undefined || prevClose <= 0) {
            continue;
          }
          const gapPct = (Math.abs(open - prevClose) / prevClose) * 100;
          const intraday =
            prevTs === null ||
            ts === null ||
            ts - prevTs < 12 * 60 * 60 * 1000;
          if (intraday && gapPct > config.maxIntradayGapPct) {
            return marketFail({
              message: `Abnormal intraday gap of ${gapPct.toFixed(2)}% at index ${i}.`,
              recommendation: config.rejectOnGapDetection
                ? "Reject suspicious intraday series."
                : "Flag gap for microstructure review.",
              path: `[${i}]`,
              expected: `<= ${config.maxIntradayGapPct}%`,
              actual: gapPct,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "gap.flash_crash_jump",
      name: "Flash Crash And Extreme Jump Detection",
      description: "Detect flash crashes, extreme jumps, and suspicious spikes.",
      category: "OHLC",
      priority: "HIGH",
      ruleLevel: level,
      tags: ["market", "gap", "spike"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "STOCK_QUOTE"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const open = readNumber(rows[i], ["open", "o", "previousClose", "prevClose"]);
          const low = readNumber(rows[i], ["low", "l"]);
          const high = readNumber(rows[i], ["high", "h"]);
          const close = readNumber(rows[i], ["close", "c", "price", "ltp"]);

          if (open && open > 0 && low !== undefined) {
            const dropPct = ((open - low) / open) * 100;
            if (dropPct >= config.flashCrashPct) {
              return marketFail({
                message: `Possible flash crash: ${dropPct.toFixed(2)}% drawdown in bar ${i}.`,
                recommendation: config.rejectOnGapDetection
                  ? "Reject bar pending exchange confirmation."
                  : "Mark as suspicious flash-crash candidate.",
                path: `[${i}]`,
                expected: `drawdown < ${config.flashCrashPct}%`,
                actual: dropPct,
              });
            }
          }

          if (open && open > 0 && high !== undefined) {
            const jumpPct = ((high - open) / open) * 100;
            if (jumpPct >= config.extremeJumpPct) {
              return marketFail({
                message: `Extreme jump of ${jumpPct.toFixed(2)}% in bar ${i}.`,
                recommendation: config.rejectOnGapDetection
                  ? "Reject extreme jump pending review."
                  : "Mark as suspicious spike.",
                path: `[${i}]`,
                expected: `jump < ${config.extremeJumpPct}%`,
                actual: jumpPct,
              });
            }
          }

          if (
            i > 0 &&
            close !== undefined &&
            open !== undefined && // previous close used as open keys above for quotes
            true
          ) {
            const prevClose = readNumber(rows[i - 1], ["close", "c", "price"]);
            if (prevClose && prevClose > 0 && close !== undefined) {
              const move = (Math.abs(close - prevClose) / prevClose) * 100;
              if (move >= config.extremeJumpPct) {
                return marketFail({
                  message: `Suspicious spike/jump of ${move.toFixed(2)}% at index ${i}.`,
                  recommendation: config.rejectOnGapDetection
                    ? "Reject dataset with extreme jump."
                    : "Flag suspicious price discontinuity.",
                  path: `[${i}]`,
                  expected: `<= ${config.extremeJumpPct}%`,
                  actual: move,
                });
              }
            }
          }
        }
        return marketPass();
      },
    },
  ];
}
