/**
 * Moving average validation rules (SMA/EMA/WMA/HMA/VWMA).
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  configFromContext,
  isPlainObject,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

const MA_KEYS = [
  "sma",
  "SMA",
  "ema",
  "EMA",
  "wma",
  "WMA",
  "hma",
  "HMA",
  "vwma",
  "VWMA",
] as const;

export function createMovingAverageValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ma.positive_finite",
      name: "Moving Averages Positive Finite",
      description: "SMA/EMA/WMA/HMA/VWMA must be finite and non-negative.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "ma"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        if (!isPlainObject(ctx.data) && !Array.isArray(ctx.data)) {
          return techPass();
        }
        for (const key of MA_KEYS) {
          const value = readIndicatorNumber(ctx.data, [key]);
          if (value === undefined) continue;
          if (!Number.isFinite(value) || Number.isNaN(value)) {
            return techFail({
              indicator: key.toUpperCase(),
              message: `${key} is NaN or non-finite.`,
              recommendation: "Recompute moving average from valid OHLC.",
              field: key,
              expected: "finite number",
              actual: value,
            });
          }
          if (value < config.maMinValue) {
            return techFail({
              indicator: key.toUpperCase(),
              message: `${key} is below configured minimum.`,
              recommendation: "Reject negative/invalid moving averages.",
              field: key,
              expected: `>= ${config.maMinValue}`,
              actual: value,
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "ma.window_continuity",
      name: "MA Window And Continuity",
      description: "Validate window length and historical continuity.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "ma", "continuity"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const window = readIndicatorNumber(ctx.data, [
          "period",
          "window",
          "length",
          "lookback",
        ]);
        if (window !== undefined && !(window > 0)) {
          return techFail({
            indicator: "MA",
            message: "Moving-average window length is invalid.",
            recommendation: "Use a positive integer window length.",
            field: "period",
            expected: "> 0",
            actual: window,
          });
        }

        for (const key of ["sma", "ema", "wma", "hma", "vwma"] as const) {
          const series = asSeries(ctx.data, key);
          const values = series
            .map((r) => readNumber(r, [key, "value"]))
            .filter((v): v is number => v !== undefined);
          for (let i = 1; i < values.length; i++) {
            if (!Number.isFinite(values[i])) {
              return techFail({
                indicator: key.toUpperCase(),
                message: `${key} continuity broken by non-finite value.`,
                recommendation: "Rebuild MA series from OHLC.",
                path: `[${i}]`,
                actual: values[i],
              });
            }
          }
        }
        return techPass();
      },
    },
    {
      id: "ma.cross_consistency",
      name: "MA Cross Consistency",
      description: "EMA should not diverge unrealistically from SMA.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "ma", "cross"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const sma = readIndicatorNumber(ctx.data, ["sma", "SMA"]);
        const ema = readIndicatorNumber(ctx.data, ["ema", "EMA"]);
        if (sma === undefined || ema === undefined || sma === 0) {
          return techPass();
        }
        const divergencePct = (Math.abs(ema - sma) / Math.abs(sma)) * 100;
        if (divergencePct > config.maMaxRelativeDivergencePct) {
          return techFail({
            indicator: "MA",
            message: "EMA diverges unrealistically from SMA.",
            recommendation: "Verify MA periods and input price series.",
            expected: `divergence <= ${config.maMaxRelativeDivergencePct}%`,
            actual: divergencePct,
          });
        }
        return techPass();
      },
    },
  ];
}
