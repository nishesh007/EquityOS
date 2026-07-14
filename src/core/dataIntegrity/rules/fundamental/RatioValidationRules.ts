/**
 * Financial ratio validation rules.
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

type Bound = { min?: number; max?: number };

export function createRatioValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ratio.core_bounds",
      name: "Financial Ratio Bounds",
      description: "Reject mathematically impossible / out-of-bound ratios.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "ratios"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const ratios = section(ctx.data, ["ratios", "valuation", "fundamentals"]);

        const checks: Array<[string, string[], Bound]> = [
          ["pe", ["pe", "peRatio", "trailingPE"], { min: config.peMin, max: config.peMax }],
          ["pb", ["pb", "pbRatio", "priceToBook"], { min: config.pbMin, max: config.pbMax }],
          ["peg", ["peg", "pegRatio"], { min: config.pegMin, max: config.pegMax }],
          ["roe", ["roe", "ROE"], { min: config.roeMin, max: config.roeMax }],
          ["roce", ["roce", "ROCE"], { min: config.roceMin, max: config.roceMax }],
          ["roa", ["roa", "ROA"], { min: config.roaMin, max: config.roaMax }],
          [
            "debtEquity",
            ["debtEquity", "debtToEquity", "deRatio"],
            { max: config.debtEquityMax },
          ],
          [
            "currentRatio",
            ["currentRatio"],
            { min: config.currentRatioMin, max: config.currentRatioMax },
          ],
          ["quickRatio", ["quickRatio", "acidTest"], { min: config.quickRatioMin }],
          [
            "interestCoverage",
            ["interestCoverage", "timesInterestEarned"],
            { min: config.interestCoverageMin },
          ],
          [
            "dividendYield",
            ["dividendYield", "yield"],
            { min: config.dividendYieldMin, max: config.dividendYieldMax },
          ],
          [
            "evEbitda",
            ["evEbitda", "evebitda", "EV_EBITDA"],
            { min: config.evEbitdaMin, max: config.evEbitdaMax },
          ],
          ["priceSales", ["priceSales", "psRatio", "priceToSales"], { max: config.priceSalesMax }],
          [
            "priceCashFlow",
            ["priceCashFlow", "pcf", "priceToCashFlow"],
            { max: config.priceCashFlowMax },
          ],
        ];

        for (const [field, keys, bound] of checks) {
          if (!keys.some((k) => k in ratios || k in (ctx.data as object))) continue;
          const value =
            readNumber(ratios, keys) ??
            readNumber(ctx.data as Record<string, unknown>, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: `Recalculate ${field}; reject impossible ratio.`,
              expected: "finite number within configured bounds",
              actual: value ?? null,
            });
          }
          if (bound.min !== undefined && value < bound.min) {
            return fundFail({
              field,
              message: `${field} below configured minimum.`,
              recommendation: `Clamp/verify ${field} inputs.`,
              expected: `>= ${bound.min}`,
              actual: value,
            });
          }
          if (bound.max !== undefined && value > bound.max) {
            return fundFail({
              field,
              message: `${field} above configured maximum.`,
              recommendation: `Clamp/verify ${field} inputs.`,
              expected: `<= ${bound.max}`,
              actual: value,
            });
          }
        }

        const ev = readNumber(ratios, ["enterpriseValue", "ev"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "enterpriseValue",
            "ev",
          ]);
        if (ev !== undefined && (!Number.isFinite(ev) || ev < 0)) {
          return fundFail({
            field: "enterpriseValue",
            message: "Enterprise Value must be finite and >= 0.",
            recommendation: "Recompute EV from market cap + net debt.",
            expected: "finite >= 0",
            actual: ev,
          });
        }

        return fundPass();
      },
    },
  ];
}
