/**
 * Balance sheet validation rules.
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

export function createBalanceSheetValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "bs.core_identity",
      name: "Balance Sheet Core Identity",
      description:
        "Assets/Liabilities non-negative; Equity consistency; key BS fields valid.",
      category: "FUNDAMENTAL",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["fundamental", "balance-sheet"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const bs = section(ctx.data, ["balanceSheet", "balance_sheet", "bs"]);

        const assets = readNumber(bs, ["totalAssets", "assets"]);
        const liabilities = readNumber(bs, ["totalLiabilities", "liabilities"]);
        const equity = readNumber(bs, [
          "equity",
          "shareholdersEquity",
          "totalEquity",
          "bookValue",
        ]);

        if (assets !== undefined && assets < 0) {
          return fundFail({
            field: "totalAssets",
            message: "Assets must be >= 0.",
            recommendation: "Reject negative total assets.",
            expected: ">= 0",
            actual: assets,
          });
        }
        if (liabilities !== undefined && liabilities < 0) {
          return fundFail({
            field: "totalLiabilities",
            message: "Liabilities must be >= 0.",
            recommendation: "Reject negative total liabilities.",
            expected: ">= 0",
            actual: liabilities,
          });
        }
        if (
          equity !== undefined &&
          equity < 0 &&
          !config.allowNegativeEquity
        ) {
          return fundFail({
            field: "equity",
            message: "Negative equity rejected by configuration.",
            recommendation: "Enable allowNegativeEquity or fix equity.",
            expected: ">= 0",
            actual: equity,
          });
        }
        if (
          assets !== undefined &&
          liabilities !== undefined &&
          equity !== undefined
        ) {
          const expected = liabilities + equity;
          if (
            Math.abs(assets - expected) >
            Math.max(config.accountingIdentityTolerance, Math.abs(assets) * 0.01)
          ) {
            return fundFail({
              field: "accountingIdentity",
              message: "Assets should approximate Liabilities + Equity.",
              recommendation: "Reconcile balance-sheet identity before AI use.",
              expected,
              actual: assets,
            });
          }
        }

        const nonNegFields: Array<[string, string[]]> = [
          ["cash", ["cash", "cashAndEquivalents"]],
          ["inventory", ["inventory"]],
          ["receivables", ["receivables", "tradeReceivables"]],
          ["debt", ["totalDebt", "debt", "longTermDebt"]],
          ["deferredTax", ["deferredTax", "deferredTaxAssets"]],
          ["cwip", ["cwip", "capitalWorkInProgress"]],
          ["minorityInterest", ["minorityInterest", "nci"]],
        ];
        for (const [field, keys] of nonNegFields) {
          if (!keys.some((k) => k in bs)) continue;
          const value = readNumber(bs, keys);
          if (value === undefined) {
            return fundFail({
              field,
              message: `${field} is missing or non-numeric.`,
              recommendation: `Provide a numeric ${field} value.`,
              expected: "number >= 0",
              actual: null,
            });
          }
          if (value < 0 && field !== "deferredTax") {
            return fundFail({
              field,
              message: `${field} cannot be negative.`,
              recommendation: `Correct ${field} from filings.`,
              expected: ">= 0",
              actual: value,
            });
          }
        }

        const bookValue = readNumber(bs, ["bookValue", "bookValuePerShare"]);
        if (bookValue !== undefined && !Number.isFinite(bookValue)) {
          return fundFail({
            field: "bookValue",
            message: "Book Value is non-finite.",
            recommendation: "Recalculate book value from equity.",
            actual: bookValue,
          });
        }

        const currentAssets = readNumber(bs, ["currentAssets"]);
        const currentLiabilities = readNumber(bs, ["currentLiabilities"]);
        const workingCapital = readNumber(bs, ["workingCapital"]);
        if (
          currentAssets !== undefined &&
          currentLiabilities !== undefined &&
          workingCapital !== undefined
        ) {
          const expected = currentAssets - currentLiabilities;
          if (Math.abs(expected - workingCapital) > config.cashReconciliationTolerance) {
            return fundFail({
              field: "workingCapital",
              message: "Working capital inconsistent with CA - CL.",
              recommendation: "Set workingCapital = currentAssets - currentLiabilities.",
              expected,
              actual: workingCapital,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
