/**
 * MACD validation rules.
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

function readMacdParts(data: unknown): {
  macd?: number;
  signal?: number;
  histogram?: number;
} {
  if (!isPlainObject(data)) return {};
  const nested = isPlainObject(data.macd) ? data.macd : null;
  const src = nested ?? data;
  return {
    macd: readNumber(src as Record<string, unknown>, [
      "macd",
      "MACD",
      "value",
      "line",
    ]),
    signal: readNumber(
      (nested ?? data) as Record<string, unknown>,
      ["signal", "SIGNAL", "signalLine"]
    ),
    histogram: readNumber(
      (nested ?? data) as Record<string, unknown>,
      ["histogram", "hist", "HIST"]
    ),
  };
}

export function createMACDValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "macd.components_finite",
      name: "MACD Components Finite",
      description: "MACD, Signal, and Histogram must exist as finite numbers.",
      category: "INDICATOR",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["technical", "macd"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        if (!("macd" in ctx.data) && !("MACD" in ctx.data)) return techPass();
        const { macd, signal, histogram } = readMacdParts(ctx.data);
        for (const [name, value] of [
          ["MACD", macd],
          ["Signal", signal],
          ["Histogram", histogram],
        ] as const) {
          if (value === undefined) {
            return techFail({
              indicator: "MACD",
              message: `${name} is missing.`,
              recommendation: "Ensure MACD line, signal, and histogram are published.",
              field: name.toLowerCase(),
              expected: "finite number",
              actual: null,
            });
          }
          if (!Number.isFinite(value) || Number.isNaN(value)) {
            return techFail({
              indicator: "MACD",
              message: `${name} is NaN or Infinity.`,
              recommendation: "Recompute MACD from clean EMA inputs.",
              field: name.toLowerCase(),
              expected: "finite number",
              actual: value,
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "macd.histogram_identity",
      name: "MACD Histogram Identity",
      description: "Histogram must equal MACD - Signal within tolerance.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "macd"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const { macd, signal, histogram } = readMacdParts(ctx.data);
        if (
          macd === undefined ||
          signal === undefined ||
          histogram === undefined
        ) {
          return techPass();
        }
        const expected = macd - signal;
        if (Math.abs(expected - histogram) > config.macdHistogramTolerance) {
          return techFail({
            indicator: "MACD",
            message: "Histogram does not equal MACD - Signal.",
            recommendation: "Fix histogram calculation before AI consumption.",
            field: "histogram",
            expected,
            actual: histogram,
          });
        }
        return techPass();
      },
    },
    {
      id: "macd.continuity_crossover",
      name: "MACD Continuity And Crossover",
      description: "Validate continuity and crossover consistency across candles.",
      category: "INDICATOR",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["technical", "macd", "continuity"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const series = asSeries(ctx.data, "macd");
        if (series.length < 2) return techPass();
        for (let i = 1; i < series.length; i++) {
          const prev = readMacdParts(series[i - 1]);
          const cur = readMacdParts(series[i]);
          if (
            prev.macd === undefined ||
            prev.signal === undefined ||
            cur.macd === undefined ||
            cur.signal === undefined
          ) {
            continue;
          }
          const prevAbove = prev.macd > prev.signal;
          const curAbove = cur.macd > cur.signal;
          const declared = readNumber(series[i], [
            "crossover",
            "cross",
            "signalCross",
          ]);
          // crossover: 1 bullish, -1 bearish, 0 none
          if (declared !== undefined) {
            const expected =
              prevAbove === curAbove ? 0 : curAbove ? 1 : -1;
            if (declared !== expected) {
              return techFail({
                indicator: "MACD",
                message: `Crossover flag inconsistent at index ${i}.`,
                recommendation: "Recompute crossover from MACD vs Signal.",
                path: `[${i}].crossover`,
                expected,
                actual: declared,
              });
            }
          }
        }
        return techPass();
      },
    },
  ];
}
