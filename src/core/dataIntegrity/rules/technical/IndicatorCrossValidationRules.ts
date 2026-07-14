/**
 * Cross-indicator logical consistency validation.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createIndicatorCrossValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "cross.rsi_stochastic",
      name: "RSI vs Stochastic Disagreement",
      description: "Extreme RSI/Stochastic disagreement raises a warning.",
      category: "INDICATOR",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["technical", "cross"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const rsi = readIndicatorNumber(ctx.data, ["rsi", "RSI"]);
        const stoch = readIndicatorNumber(ctx.data, [
          "stochastic",
          "stochK",
          "stoch",
        ]);
        if (rsi === undefined || stoch === undefined) return techPass();
        if (Math.abs(rsi - stoch) >= config.crossRsiStochDisagreement) {
          // especially when on opposite extremes
          const opposite =
            (rsi >= 70 && stoch <= 30) || (rsi <= 30 && stoch >= 70);
          if (opposite || Math.abs(rsi - stoch) >= config.crossRsiStochDisagreement) {
            return techFail({
              indicator: "Cross",
              message: "RSI and Stochastic show extreme disagreement.",
              recommendation:
                "Warn only; confirm oscillator periods and price inputs.",
              expected: `abs(rsi-stoch) < ${config.crossRsiStochDisagreement}`,
              actual: { rsi, stoch, delta: Math.abs(rsi - stoch) },
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "cross.macd_histogram",
      name: "MACD Histogram Cross Check",
      description: "MACD histogram must remain consistent with MACD-Signal.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "cross", "macd"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        const config = configFromContext(ctx);
        const src = isPlainObject(ctx.data.macd)
          ? (ctx.data.macd as Record<string, unknown>)
          : (ctx.data as Record<string, unknown>);
        const macd = readNumber(src, ["macd", "value", "line"]);
        const signal = readNumber(src, ["signal"]);
        const histogram = readNumber(src, ["histogram", "hist"]);
        if (
          macd === undefined ||
          signal === undefined ||
          histogram === undefined
        ) {
          return techPass();
        }
        if (Math.abs(macd - signal - histogram) > config.macdHistogramTolerance) {
          return techFail({
            indicator: "MACD",
            message: "Cross-check failed: histogram != MACD - Signal.",
            recommendation: "Align histogram with MACD components.",
            expected: macd - signal,
            actual: histogram,
          });
        }
        return techPass();
      },
    },
    {
      id: "cross.adx_supertrend",
      name: "ADX Trend vs Supertrend",
      description: "ADX directional bias should not contradict Supertrend.",
      category: "INDICATOR",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["technical", "cross"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const plusDI = readIndicatorNumber(ctx.data, ["plusDI", "+DI", "pdi"]);
        const minusDI = readIndicatorNumber(ctx.data, [
          "minusDI",
          "-DI",
          "mdi",
        ]);
        const stDir = readIndicatorNumber(ctx.data, [
          "direction",
          "stDirection",
          "supertrendDirection",
        ]);
        if (
          plusDI === undefined ||
          minusDI === undefined ||
          stDir === undefined
        ) {
          return techPass();
        }
        const adxBias = plusDI > minusDI ? 1 : plusDI < minusDI ? -1 : 0;
        if (adxBias !== 0 && stDir !== 0 && adxBias !== stDir) {
          return techFail({
            indicator: "Cross",
            message: "ADX DI bias disagrees with Supertrend direction.",
            recommendation: "Warn; trends may be transitioning.",
            expected: adxBias,
            actual: { adxBias, supertrend: stDir },
          });
        }
        return techPass();
      },
    },
    {
      id: "cross.vwap_ma",
      name: "VWAP vs Moving Average",
      description: "VWAP should not diverge unrealistically from SMA/EMA.",
      category: "INDICATOR",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["technical", "cross", "vwap"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const vwap = readIndicatorNumber(ctx.data, ["vwap", "VWAP"]);
        const ma =
          readIndicatorNumber(ctx.data, ["sma", "SMA"]) ??
          readIndicatorNumber(ctx.data, ["ema", "EMA"]);
        if (vwap === undefined || ma === undefined || ma === 0) {
          return techPass();
        }
        const divergence = (Math.abs(vwap - ma) / Math.abs(ma)) * 100;
        if (divergence > config.maMaxRelativeDivergencePct) {
          return techFail({
            indicator: "Cross",
            message: "VWAP diverges unrealistically from moving average.",
            recommendation: "Confirm session VWAP reset and MA period.",
            expected: `divergence <= ${config.maMaxRelativeDivergencePct}%`,
            actual: divergence,
          });
        }
        return techPass();
      },
    },
    {
      id: "cross.bb_atr",
      name: "Bollinger Width vs ATR",
      description: "Band width and ATR should both reflect volatility regime.",
      category: "INDICATOR",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["technical", "cross", "bollinger", "atr"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        const atr = readIndicatorNumber(ctx.data, ["atr", "ATR"]);
        const bb = isPlainObject(ctx.data.bollinger)
          ? (ctx.data.bollinger as Record<string, unknown>)
          : (ctx.data as Record<string, unknown>);
        const width =
          readNumber(bb, ["width", "bandwidth"]) ??
          (() => {
            const upper = readNumber(bb, ["upper", "upperBand"]);
            const lower = readNumber(bb, ["lower", "lowerBand"]);
            return upper !== undefined && lower !== undefined
              ? upper - lower
              : undefined;
          })();
        if (atr === undefined || width === undefined || atr <= 0) {
          return techPass();
        }
        // Width typically scales with ATR; extreme mismatch is suspicious
        const ratio = width / atr;
        if (ratio > 50 || ratio < 0.01) {
          return techFail({
            indicator: "Cross",
            message: "Bollinger width inconsistent with ATR volatility.",
            recommendation: "Verify BB stddev multiplier and ATR period.",
            expected: "0.01 <= width/atr <= 50",
            actual: ratio,
          });
        }
        return techPass();
      },
    },
  ];
}
