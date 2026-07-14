/**
 * Supertrend validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asSeries,
  isPlainObject,
  readIndicatorNumber,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

export function createSupertrendValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "supertrend.structure",
      name: "Supertrend Structure",
      description: "Validate trend direction, band position, flip continuity.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "supertrend"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data) && !Array.isArray(ctx.data)) {
          return techPass();
        }
        if (
          isPlainObject(ctx.data) &&
          !("supertrend" in ctx.data) &&
          !("Supertrend" in ctx.data) &&
          !("st" in ctx.data)
        ) {
          return techPass();
        }

        const value = readIndicatorNumber(ctx.data, [
          "supertrend",
          "Supertrend",
          "st",
          "value",
        ]);
        const direction = readIndicatorNumber(ctx.data, [
          "trend",
          "direction",
          "stDirection",
        ]);
        const price = readIndicatorNumber(ctx.data, ["price", "close"]);

        if (value !== undefined && !Number.isFinite(value)) {
          return techFail({
            indicator: "Supertrend",
            message: "Supertrend value is non-finite.",
            recommendation: "Recompute Supertrend from ATR bands.",
            actual: value,
          });
        }
        if (direction !== undefined && direction !== 1 && direction !== -1) {
          return techFail({
            indicator: "Supertrend",
            message: "Supertrend direction must be 1 or -1.",
            recommendation: "Normalize trend direction flags.",
            field: "direction",
            expected: [1, -1],
            actual: direction,
          });
        }
        if (
          value !== undefined &&
          direction !== undefined &&
          price !== undefined
        ) {
          // Bullish: price above band; bearish: price below band
          if (direction === 1 && price < value) {
            return techFail({
              indicator: "Supertrend",
              message: "Bullish Supertrend but price below band.",
              recommendation: "Reconcile band position with trend direction.",
              expected: "price >= supertrend",
              actual: { price, value, direction },
            });
          }
          if (direction === -1 && price > value) {
            return techFail({
              indicator: "Supertrend",
              message: "Bearish Supertrend but price above band.",
              recommendation: "Reconcile band position with trend direction.",
              expected: "price <= supertrend",
              actual: { price, value, direction },
            });
          }
        }

        const series = asSeries(ctx.data, "supertrend");
        for (let i = 1; i < series.length; i++) {
          const prevDir = readNumber(series[i - 1], ["direction", "trend"]);
          const curDir = readNumber(series[i], ["direction", "trend"]);
          const flip = readNumber(series[i], ["flip", "trendFlip"]);
          if (prevDir === undefined || curDir === undefined) continue;
          const flipped = prevDir !== curDir;
          if (flip !== undefined && Boolean(flip) !== flipped) {
            return techFail({
              indicator: "Supertrend",
              message: `Flip consistency broken at index ${i}.`,
              recommendation: "Derive flip from direction changes.",
              path: `[${i}].flip`,
              expected: flipped,
              actual: flip,
            });
          }
        }
        return techPass();
      },
    },
  ];
}
