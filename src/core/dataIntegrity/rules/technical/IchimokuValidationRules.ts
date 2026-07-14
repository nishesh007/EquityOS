/**
 * Ichimoku validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  isPlainObject,
  readNumber,
  techFail,
  techPass,
  type TechnicalValidationConfig,
} from "./TechnicalRuleRegistry";

function readIchimoku(data: unknown) {
  if (!isPlainObject(data)) return null;
  const src = isPlainObject(data.ichimoku)
    ? (data.ichimoku as Record<string, unknown>)
    : data;
  if (
    !("tenkan" in src) &&
    !("tenkanSen" in src) &&
    !("kijun" in src) &&
    !("spanA" in src) &&
    !("ichimoku" in data)
  ) {
    return null;
  }
  return {
    tenkan: readNumber(src, ["tenkan", "tenkanSen", "conversion"]),
    kijun: readNumber(src, ["kijun", "kijunSen", "base"]),
    spanA: readNumber(src, ["spanA", "senkouSpanA", "leadingSpanA"]),
    spanB: readNumber(src, ["spanB", "senkouSpanB", "leadingSpanB"]),
    lagging: readNumber(src, ["lagging", "chikou", "chikouSpan", "laggingSpan"]),
  };
}

export function createIchimokuValidationRules(
  _config: TechnicalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ichimoku.components",
      name: "Ichimoku Components",
      description: "Validate Tenkan, Kijun, Span A/B, Lagging Span and cloud.",
      category: "INDICATOR",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["technical", "ichimoku"],
      author: "equityos-technical",
      datasetTypes: ["TECHNICAL_INDICATOR"],
      validate: (ctx) => {
        const parts = readIchimoku(ctx.data);
        if (!parts) return techPass();

        for (const [name, value] of Object.entries(parts)) {
          if (value === undefined) {
            return techFail({
              indicator: "Ichimoku",
              message: `${name} is missing.`,
              recommendation: "Publish full Ichimoku component set.",
              field: name,
              expected: "finite number",
              actual: null,
            });
          }
          if (!Number.isFinite(value)) {
            return techFail({
              indicator: "Ichimoku",
              message: `${name} is non-finite.`,
              recommendation: "Recompute Ichimoku from OHLC midpoints.",
              field: name,
              actual: value,
            });
          }
        }

        const { tenkan, kijun, spanA, spanB } = parts;
        // Cloud consistency: Span A is typically average of Tenkan/Kijun
        if (
          tenkan !== undefined &&
          kijun !== undefined &&
          spanA !== undefined
        ) {
          const expectedSpanA = (tenkan + kijun) / 2;
          if (Math.abs(expectedSpanA - spanA) / Math.max(Math.abs(expectedSpanA), 1) > 0.05) {
            return techFail({
              indicator: "Ichimoku",
              message: "Span A inconsistent with Tenkan/Kijun average.",
              recommendation: "Set Span A = (Tenkan + Kijun) / 2 (then project).",
              field: "spanA",
              expected: expectedSpanA,
              actual: spanA,
            });
          }
        }

        if (spanA !== undefined && spanB !== undefined) {
          // Cloud exists as long as both spans are present and finite (already checked)
          if (spanA === spanB) {
            // flat cloud is valid but worth noting via pass
          }
        }

        const projected = isPlainObject(ctx.data)
          ? readNumber(ctx.data as Record<string, unknown>, [
              "projectionBars",
              "cloudProjection",
            ])
          : undefined;
        if (projected !== undefined && projected < 0) {
          return techFail({
            indicator: "Ichimoku",
            message: "Cloud projection bars cannot be negative.",
            recommendation: "Use non-negative projection offset (typically 26).",
            field: "projectionBars",
            expected: ">= 0",
            actual: projected,
          });
        }

        return techPass();
      },
    },
  ];
}
