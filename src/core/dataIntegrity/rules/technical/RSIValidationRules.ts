/**
 * RSI validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  configFromContext,
  detectFrozenValues,
  isPlainObject,
  maxJump,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createRSIValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rsi.exists_numeric",
      name: "RSI Exists And Numeric",
      description: "RSI must exist as a finite numeric value when provided.",
      category: "INDICATOR",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["technical", "rsi"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data) && !Array.isArray(ctx.data)) {
          return techPass();
        }
        const hasRsiKey =
          isPlainObject(ctx.data) &&
          ("rsi" in ctx.data ||
            "RSI" in ctx.data ||
            (isPlainObject(ctx.data.values) &&
              ("rsi" in (ctx.data.values as object) ||
                "RSI" in (ctx.data.values as object))));
        if (!hasRsiKey && !Array.isArray(ctx.data)) return techPass();

        const rsi = readIndicatorNumber(ctx.data, ["rsi", "RSI"]);
        if (rsi === undefined) {
          // series form
          const series = asSeries(ctx.data, "rsi");
          const values = series
            .map((r) => readNumber(r, ["rsi", "RSI", "value"]))
            .filter((v): v is number => v !== undefined);
          if (values.length === 0 && hasRsiKey) {
            return techFail({
              indicator: "RSI",
              message: "RSI is missing or non-numeric.",
              recommendation: "Recalculate RSI with a valid lookback period.",
              expected: "finite number",
              actual: null,
            });
          }
          for (const v of values) {
            if (!Number.isFinite(v) || Number.isNaN(v)) {
              return techFail({
                indicator: "RSI",
                message: "RSI contains NaN or Infinity.",
                recommendation: "Discard corrupted RSI series and recompute.",
                expected: "finite number",
                actual: v,
              });
            }
          }
          return techPass();
        }
        if (!Number.isFinite(rsi) || Number.isNaN(rsi)) {
          return techFail({
            indicator: "RSI",
            message: "RSI is NaN or non-finite.",
            recommendation: "Discard corrupted RSI and recompute.",
            expected: "finite number",
            actual: rsi,
          });
        }
        return techPass();
      },
    },
    {
      id: "rsi.bounds",
      name: "RSI Bounds 0-100",
      description: "RSI must remain within configured 0–100 bounds.",
      category: "INDICATOR",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["technical", "rsi"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const values: number[] = [];
        const single = readIndicatorNumber(ctx.data, ["rsi", "RSI"]);
        if (single !== undefined) values.push(single);
        else {
          for (const row of asSeries(ctx.data, "rsi")) {
            const v = readNumber(row, ["rsi", "RSI", "value"]);
            if (v !== undefined) values.push(v);
          }
        }
        if (values.length === 0) return techPass();
        for (const v of values) {
          if (v < config.rsiMin || v > config.rsiMax) {
            return techFail({
              indicator: "RSI",
              message: "RSI outside 0–100 bounds.",
              recommendation: "Reject invalid RSI before AI/screener consumption.",
              expected: { min: config.rsiMin, max: config.rsiMax },
              actual: v,
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "rsi.extremes_jumps_continuity",
      name: "RSI Extremes Jumps Continuity",
      description:
        "Flag extreme RSI, impossible jumps, frozen values, and missing periods.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "rsi", "continuity"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const values: number[] = [];
        const single = readIndicatorNumber(ctx.data, ["rsi", "RSI"]);
        if (single !== undefined) values.push(single);
        for (const row of asSeries(ctx.data, "rsi")) {
          const v = readNumber(row, ["rsi", "RSI", "value"]);
          if (v !== undefined) values.push(v);
        }
        if (values.length === 0) return techPass();

        const period = readIndicatorNumber(ctx.data, ["period", "length", "lookback"]);
        if (period !== undefined && period < config.rsiMinPeriod) {
          return techFail({
            indicator: "RSI",
            message: "RSI calculation period is missing or too short.",
            recommendation: "Use a valid RSI lookback (typically >= 2).",
            field: "period",
            expected: `>= ${config.rsiMinPeriod}`,
            actual: period,
          });
        }

        for (const v of values) {
          if (v <= config.rsiExtremeLow || v >= config.rsiExtremeHigh) {
            return techFail({
              indicator: "RSI",
              message: "Extreme RSI value flagged.",
              recommendation: "Allow with warning; confirm input OHLC quality.",
              expected: {
                warnOutside: [config.rsiExtremeLow, config.rsiExtremeHigh],
              },
              actual: v,
            });
          }
        }

        if (values.length > 1 && maxJump(values) > config.rsiMaxJump) {
          return techFail({
            indicator: "RSI",
            message: "Sudden impossible RSI jump detected.",
            recommendation: "Recalculate RSI; check for OHLC gaps/corruption.",
            expected: `jump <= ${config.rsiMaxJump}`,
            actual: maxJump(values),
          });
        }

        if (detectFrozenValues(values, config.frozenRepeatCount)) {
          return techFail({
            indicator: "RSI",
            message: "RSI appears frozen/repeated — possible calculation corruption.",
            recommendation: "Recompute indicator series from raw OHLC.",
            actual: values.slice(-config.frozenRepeatCount),
          });
        }

        return techPass();
      },
    },
  ];
}
