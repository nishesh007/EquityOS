/**
 * Profitability metric validation.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  fundFail,
  fundPass,
  isPlainObject,
  readNumber,
  section,
  type FundamentalValidationConfig,
} from "./FundamentalRuleRegistry";

export function createProfitabilityValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "profit.margins_returns",
      name: "Profitability Margins And Returns",
      description:
        "Validate gross/operating/net/EBITDA margins and ROE/ROCE/ROA continuity.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "profitability"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const src = section(ctx.data, [
          "profitability",
          "ratios",
          "incomeStatement",
        ]);

        const marginFields: Array<[string, string[]]> = [
          ["grossMargin", ["grossMargin"]],
          ["operatingMargin", ["operatingMargin"]],
          ["netMargin", ["netMargin"]],
          ["ebitdaMargin", ["ebitdaMargin"]],
        ];
        for (const [field, keys] of marginFields) {
          if (!keys.some((k) => k in src || k in (ctx.data as object))) continue;
          const value =
            readNumber(src, keys) ??
            readNumber(ctx.data as Record<string, unknown>, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: `Recalculate ${field}.`,
              actual: value ?? null,
            });
          }
          if (value < config.marginMin || value > config.marginMax) {
            return fundFail({
              field,
              message: `${field} outside configured bounds.`,
              recommendation: "Verify percent units and inputs.",
              expected: { min: config.marginMin, max: config.marginMax },
              actual: value,
            });
          }
        }

        const returnFields: Array<[string, string[], number, number]> = [
          ["roe", ["roe", "ROE"], config.roeMin, config.roeMax],
          ["roce", ["roce", "ROCE"], config.roceMin, config.roceMax],
          ["roa", ["roa", "ROA"], config.roaMin, config.roaMax],
        ];
        for (const [field, keys, min, max] of returnFields) {
          if (!keys.some((k) => k in src || k in (ctx.data as object))) continue;
          const value =
            readNumber(src, keys) ??
            readNumber(ctx.data as Record<string, unknown>, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: `Recalculate ${field}.`,
              actual: value ?? null,
            });
          }
          if (value < min || value > max) {
            return fundFail({
              field,
              message: `${field} outside configured bounds.`,
              recommendation: `Verify ${field.toUpperCase()} inputs.`,
              expected: { min, max },
              actual: value,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
