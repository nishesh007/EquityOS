/**
 * Corporate financial statement-level consistency helpers.
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

export function createCorporateFinancialConsistencyRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "corpfin.book_value_equity",
      name: "Book Value vs Equity",
      description: "Book value should reconcile with shareholders' equity.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["fundamental", "consistency"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const bs = section(ctx.data, ["balanceSheet", "bs"]);
        const equity = readNumber(bs, [
          "equity",
          "shareholdersEquity",
          "totalEquity",
        ]);
        const bookValue = readNumber(bs, ["bookValue"]);
        const shares = readNumber(bs, [
          "sharesOutstanding",
          "shareCount",
          "dilutedShares",
        ]);
        const bvps = readNumber(bs, ["bookValuePerShare", "bvps"]);

        if (equity !== undefined && bookValue !== undefined) {
          if (
            Math.abs(equity - bookValue) >
            Math.max(config.accountingIdentityTolerance, Math.abs(equity) * 0.02)
          ) {
            // bookValue may mean BVPS in some feeds — only compare when similar magnitude
            if (
              Math.abs(equity) > 0 &&
              Math.abs(bookValue) / Math.abs(equity) > 0.1
            ) {
              return fundFail({
                field: "bookValue",
                message: "Book Value diverges from shareholders' equity.",
                recommendation: "Align book value with equity from filings.",
                expected: equity,
                actual: bookValue,
              });
            }
          }
        }

        if (
          equity !== undefined &&
          shares !== undefined &&
          shares > 0 &&
          bvps !== undefined
        ) {
          const expected = equity / shares;
          if (
            Math.abs(expected - bvps) / Math.max(Math.abs(expected), 1e-9) >
            0.05
          ) {
            return fundFail({
              field: "bookValuePerShare",
              message: "BVPS inconsistent with Equity / Shares.",
              recommendation: "Set BVPS = Equity / Shares Outstanding.",
              expected,
              actual: bvps,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
