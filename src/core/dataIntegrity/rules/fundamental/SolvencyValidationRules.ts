/**
 * Solvency validation rules.
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

export function createSolvencyValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "solvency.debt_coverage",
      name: "Solvency Debt And Coverage",
      description:
        "Validate debt trend, debt/equity, interest coverage, net debt.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "solvency"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const src = section(ctx.data, ["solvency", "ratios", "balanceSheet"]);

        const de =
          readNumber(src, ["debtEquity", "debtToEquity"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "debtEquity",
            "debtToEquity",
          ]);
        if (de !== undefined) {
          if (!Number.isFinite(de) || de > config.debtEquityMax || de < 0) {
            return fundFail({
              field: "debtEquity",
              message: "Debt/Equity invalid or above configured max.",
              recommendation: "Verify debt and equity inputs.",
              expected: { min: 0, max: config.debtEquityMax },
              actual: de,
            });
          }
        }

        const coverage =
          readNumber(src, ["interestCoverage"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["interestCoverage"]);
        if (coverage !== undefined) {
          if (
            !Number.isFinite(coverage) ||
            coverage < config.interestCoverageMin
          ) {
            return fundFail({
              field: "interestCoverage",
              message: "Interest coverage below configured minimum.",
              recommendation: "Review debt servicing capability.",
              expected: `>= ${config.interestCoverageMin}`,
              actual: coverage,
            });
          }
        }

        const totalDebt =
          readNumber(src, ["totalDebt", "debt"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["totalDebt", "debt"]);
        const cash =
          readNumber(src, ["cash", "cashAndEquivalents"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "cash",
            "cashAndEquivalents",
          ]);
        const netDebt =
          readNumber(src, ["netDebt"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["netDebt"]);
        if (
          totalDebt !== undefined &&
          cash !== undefined &&
          netDebt !== undefined
        ) {
          const expected = totalDebt - cash;
          if (Math.abs(expected - netDebt) > 1) {
            return fundFail({
              field: "netDebt",
              message: "Net Debt inconsistent with Total Debt - Cash.",
              recommendation: "Set netDebt = totalDebt - cash.",
              expected,
              actual: netDebt,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
