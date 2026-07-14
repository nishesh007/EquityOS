/**
 * Bollinger Band validation rules.
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

function readBands(data: unknown) {
  if (!isPlainObject(data)) return {};
  const bb = isPlainObject(data.bollinger)
    ? (data.bollinger as Record<string, unknown>)
    : isPlainObject(data.bb)
      ? (data.bb as Record<string, unknown>)
      : (data as Record<string, unknown>);
  return {
    upper: readNumber(bb, ["upper", "upperBand", "ub"]),
    middle: readNumber(bb, ["middle", "middleBand", "mb", "basis", "sma"]),
    lower: readNumber(bb, ["lower", "lowerBand", "lb"]),
    width: readNumber(bb, ["width", "bandwidth", "bandWidth"]),
  };
}

export function createBollingerBandValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "bb.structure",
      name: "Bollinger Band Structure",
      description: "Upper > Middle > Lower and width must be valid.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "bollinger"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        if (
          !("bollinger" in ctx.data) &&
          !("bb" in ctx.data) &&
          !("upperBand" in ctx.data) &&
          !("upper" in ctx.data)
        ) {
          return techPass();
        }
        const config = configFromContext(ctx);
        const { upper, middle, lower, width } = readBands(ctx.data);
        for (const [name, value] of [
          ["upper", upper],
          ["middle", middle],
          ["lower", lower],
        ] as const) {
          if (value === undefined) {
            return techFail({
              indicator: "Bollinger",
              message: `${name} band is missing.`,
              recommendation: "Publish upper, middle, and lower bands together.",
              field: name,
              expected: "finite number",
              actual: null,
            });
          }
          if (!Number.isFinite(value)) {
            return techFail({
              indicator: "Bollinger",
              message: `${name} band is non-finite.`,
              recommendation: "Recompute Bollinger bands from SMA/stddev.",
              field: name,
              actual: value,
            });
          }
        }
        if (!(upper! > middle! && middle! > lower!)) {
          return techFail({
            indicator: "Bollinger",
            message: "Expected Upper > Middle > Lower.",
            recommendation: "Reject inverted Bollinger structure.",
            expected: "upper > middle > lower",
            actual: { upper, middle, lower },
          });
        }
        const expectedWidth = upper! - lower!;
        if (width !== undefined) {
          if (width < config.bollingerMinWidth) {
            return techFail({
              indicator: "Bollinger",
              message: "Band width below configured minimum.",
              recommendation: "Check stddev multiplier / input volatility.",
              field: "width",
              expected: `>= ${config.bollingerMinWidth}`,
              actual: width,
            });
          }
          if (Math.abs(width - expectedWidth) > 1e-6) {
            return techFail({
              indicator: "Bollinger",
              message: "Band width inconsistent with upper-lower.",
              recommendation: "Set width = upper - lower.",
              field: "width",
              expected: expectedWidth,
              actual: width,
            });
          }
        }
        return techPass();
      },
    },
    {
      id: "bb.expansion_contraction",
      name: "Bollinger Expansion Contraction",
      description: "Validate band expansion/contraction continuity flags.",
      category: "INDICATOR",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["technical", "bollinger"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return techPass();
        const width = readBands(ctx.data).width;
        const prevWidth = readIndicatorNumber(ctx.data, [
          "prevWidth",
          "previousBandWidth",
        ]);
        const expansion = readIndicatorNumber(ctx.data, ["expansion"]);
        if (width === undefined || prevWidth === undefined) return techPass();
        const expanding = width > prevWidth;
        if (expansion !== undefined) {
          const expected = expanding ? 1 : 0;
          if (expansion !== expected) {
            return techFail({
              indicator: "Bollinger",
              message: "Band expansion/contraction flag inconsistent.",
              recommendation: "Derive expansion from width delta.",
              field: "expansion",
              expected,
              actual: expansion,
            });
          }
        }
        return techPass();
      },
    },
  ];
}
