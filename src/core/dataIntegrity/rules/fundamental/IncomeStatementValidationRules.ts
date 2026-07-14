/**
 * Income statement validation rules.
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

export function createIncomeStatementValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "is.core_statement",
      name: "Income Statement Core",
      description:
        "Validate revenue through EPS chain; negative values only where logical.",
      category: "FUNDAMENTAL",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["fundamental", "income-statement"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const inc = section(ctx.data, [
          "incomeStatement",
          "income_statement",
          "pnl",
          "is",
        ]);

        const revenue = readNumber(inc, ["revenue", "totalRevenue", "sales"]);
        if (revenue !== undefined) {
          if (!Number.isFinite(revenue)) {
            return fundFail({
              field: "revenue",
              message: "Revenue is non-finite.",
              recommendation: "Reject corrupted revenue.",
              actual: revenue,
            });
          }
          if (revenue < 0 && !config.allowNegativeRevenue) {
            return fundFail({
              field: "revenue",
              message: "Negative revenue rejected by configuration.",
              recommendation: "Enable allowNegativeRevenue or fix revenue.",
              expected: ">= 0",
              actual: revenue,
            });
          }
        }

        const cogs = readNumber(inc, ["cogs", "costOfGoodsSold", "costOfRevenue"]);
        const grossProfit = readNumber(inc, ["grossProfit"]);
        if (
          revenue !== undefined &&
          cogs !== undefined &&
          grossProfit !== undefined
        ) {
          const expected = revenue - cogs;
          if (
            Math.abs(expected - grossProfit) >
            Math.max(config.accountingIdentityTolerance, Math.abs(expected) * 0.01)
          ) {
            return fundFail({
              field: "grossProfit",
              message: "Gross Profit should equal Revenue - COGS.",
              recommendation: "Reconcile gross profit identity.",
              expected,
              actual: grossProfit,
            });
          }
        }

        const finiteFields: Array<[string, string[]]> = [
          ["ebitda", ["ebitda", "EBITDA"]],
          ["ebit", ["ebit", "EBIT", "operatingIncome"]],
          ["pbt", ["pbt", "profitBeforeTax", "pretaxIncome"]],
          ["pat", ["pat", "netIncome", "profitAfterTax"]],
          ["eps", ["eps", "earningsPerShare"]],
          ["dilutedEps", ["dilutedEps", "dilutedEPS"]],
          ["interest", ["interest", "interestExpense", "interestCost"]],
          ["tax", ["tax", "taxExpense"]],
        ];
        for (const [field, keys] of finiteFields) {
          if (!keys.some((k) => k in inc)) continue;
          const value = readNumber(inc, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: `Provide a finite ${field} from filings.`,
              expected: "finite number",
              actual: value ?? null,
            });
          }
        }

        // Margins when present
        for (const [field, keys] of [
          ["grossMargin", ["grossMargin"]],
          ["operatingMargin", ["operatingMargin"]],
          ["netMargin", ["netMargin"]],
        ] as const) {
          const value = readNumber(inc, [...keys]);
          if (value === undefined) continue;
          if (value < config.marginMin || value > config.marginMax) {
            return fundFail({
              field,
              message: `${field} outside configured margin bounds.`,
              recommendation: "Verify margin calculation units (percent).",
              expected: { min: config.marginMin, max: config.marginMax },
              actual: value,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
