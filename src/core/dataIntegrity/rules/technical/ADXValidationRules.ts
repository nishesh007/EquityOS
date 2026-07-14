/**
 * ADX / DI validation rules.
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

export function createADXValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "adx.bounds_finite",
      name: "ADX Bounds And Finite DI",
      description: "ADX in 0–100; +DI/-DI finite; trend consistency.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "adx"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        if (!("adx" in ctx.data) && !("ADX" in ctx.data)) return techPass();
        const config = configFromContext(ctx);
        const adx = readIndicatorNumber(ctx.data, ["adx", "ADX"]);
        const plusDI = readIndicatorNumber(ctx.data, [
          "plusDI",
          "+DI",
          "pdi",
          "diPlus",
        ]);
        const minusDI = readIndicatorNumber(ctx.data, [
          "minusDI",
          "-DI",
          "mdi",
          "diMinus",
        ]);

        if (adx !== undefined) {
          if (!Number.isFinite(adx) || adx < config.adxMin || adx > config.adxMax) {
            return techFail({
              indicator: "ADX",
              message: "ADX outside 0–100 or non-finite.",
              recommendation: "Recompute ADX; reject before AI layer.",
              expected: { min: config.adxMin, max: config.adxMax },
              actual: adx,
            });
          }
        }
        for (const [name, value] of [
          ["+DI", plusDI],
          ["-DI", minusDI],
        ] as const) {
          if (value === undefined) continue;
          if (!Number.isFinite(value) || value < 0) {
            return techFail({
              indicator: "ADX",
              message: `${name} is invalid.`,
              recommendation: "Recalculate directional indicators.",
              field: name,
              expected: "finite >= 0",
              actual: value,
            });
          }
        }

        const trend = readNumber(ctx.data as Record<string, unknown>, [
          "trend",
          "adxTrend",
        ]);
        // trend: 1 bullish (+DI > -DI), -1 bearish
        if (
          trend !== undefined &&
          plusDI !== undefined &&
          minusDI !== undefined
        ) {
          const expected = plusDI > minusDI ? 1 : plusDI < minusDI ? -1 : 0;
          if (trend !== expected) {
            return techFail({
              indicator: "ADX",
              message: "ADX trend flag inconsistent with +DI/-DI.",
              recommendation: "Derive trend from +DI vs -DI comparison.",
              field: "trend",
              expected,
              actual: trend,
            });
          }
        }
        return techPass();
      },
    },
  ];
}
