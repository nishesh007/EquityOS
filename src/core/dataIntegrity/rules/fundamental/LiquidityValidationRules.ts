/**
 * Liquidity validation rules.
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

export function createLiquidityValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "liquidity.ratios",
      name: "Liquidity Ratios",
      description:
        "Validate current/quick/cash ratios, working capital, operating liquidity.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "liquidity"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const src = section(ctx.data, ["liquidity", "ratios", "balanceSheet"]);

        const current =
          readNumber(src, ["currentRatio"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["currentRatio"]);
        if (current !== undefined) {
          if (
            !Number.isFinite(current) ||
            current < config.currentRatioMin ||
            current > config.currentRatioMax
          ) {
            return fundFail({
              field: "currentRatio",
              message: "Current ratio outside configured bounds.",
              recommendation: "Verify current assets/liabilities.",
              expected: {
                min: config.currentRatioMin,
                max: config.currentRatioMax,
              },
              actual: current,
            });
          }
        }

        const quick =
          readNumber(src, ["quickRatio", "acidTest"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "quickRatio",
            "acidTest",
          ]);
        if (quick !== undefined) {
          if (!Number.isFinite(quick) || quick < config.quickRatioMin) {
            return fundFail({
              field: "quickRatio",
              message: "Quick ratio below configured minimum.",
              recommendation: "Review liquid assets vs current liabilities.",
              expected: `>= ${config.quickRatioMin}`,
              actual: quick,
            });
          }
        }

        const cashRatio =
          readNumber(src, ["cashRatio"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["cashRatio"]);
        if (cashRatio !== undefined && (!Number.isFinite(cashRatio) || cashRatio < 0)) {
          return fundFail({
            field: "cashRatio",
            message: "Cash ratio invalid.",
            recommendation: "Recalculate cash / current liabilities.",
            expected: "finite >= 0",
            actual: cashRatio,
          });
        }

        const ca = readNumber(src, ["currentAssets"]);
        const cl = readNumber(src, ["currentLiabilities"]);
        const wc =
          readNumber(src, ["workingCapital"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["workingCapital"]);
        if (ca !== undefined && cl !== undefined && wc !== undefined) {
          const expected = ca - cl;
          if (Math.abs(expected - wc) > 1) {
            return fundFail({
              field: "workingCapital",
              message: "Working capital inconsistent with CA - CL.",
              recommendation: "Reconcile operating liquidity identity.",
              expected,
              actual: wc,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
