/**
 * Cross-statement fundamental validation.
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

export function createFundamentalCrossValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "cross.pat_eps",
      name: "PAT vs EPS",
      description: "PAT should reconcile with EPS × shares.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "cross"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const inc = section(ctx.data, ["incomeStatement", "is", "pnl"]);
        const bs = section(ctx.data, ["balanceSheet", "bs"]);
        const pat =
          readNumber(inc, ["pat", "netIncome"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["pat", "netIncome"]);
        const eps =
          readNumber(inc, ["eps", "earningsPerShare"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["eps"]);
        const shares =
          readNumber(bs, ["sharesOutstanding", "shareCount"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "sharesOutstanding",
            "shareCount",
          ]);
        if (pat === undefined || eps === undefined || shares === undefined) {
          return fundPass();
        }
        if (shares <= 0) return fundPass();
        const expectedEps = pat / shares;
        const pct =
          (Math.abs(expectedEps - eps) / Math.max(Math.abs(expectedEps), 1e-9)) *
          100;
        if (pct > config.epsPatTolerancePct) {
          return fundFail({
            field: "eps",
            message: "EPS does not reconcile with PAT / shares.",
            recommendation: "Reconcile EPS with PAT and share count.",
            expected: expectedEps,
            actual: eps,
          });
        }
        return fundPass();
      },
    },
    {
      id: "cross.ocf_earnings",
      name: "OCF vs Earnings",
      description: "Operating cash flow should support reported earnings quality.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["fundamental", "cross", "cash-flow"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const inc = section(ctx.data, ["incomeStatement", "is"]);
        const cf = section(ctx.data, ["cashFlow", "cf"]);
        const pat =
          readNumber(inc, ["pat", "netIncome"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["pat"]);
        const ocf =
          readNumber(cf, ["operatingCashFlow", "ocf"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "operatingCashFlow",
            "ocf",
          ]);
        if (pat === undefined || ocf === undefined) return fundPass();
        if (pat > 0 && ocf < 0) {
          return fundFail({
            field: "operatingCashFlow",
            message: "Positive PAT with negative operating cash flow.",
            recommendation: "Flag earnings-quality risk for analyst review.",
            actual: { pat, ocf },
          });
        }
        return fundPass();
      },
    },
    {
      id: "cross.debt_interest",
      name: "Debt vs Interest Expense",
      description: "Interest expense should be consistent with debt levels.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["fundamental", "cross"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const bs = section(ctx.data, ["balanceSheet", "bs"]);
        const inc = section(ctx.data, ["incomeStatement", "is"]);
        const debt =
          readNumber(bs, ["totalDebt", "debt"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["totalDebt", "debt"]);
        const interest =
          readNumber(inc, ["interest", "interestExpense"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "interest",
            "interestExpense",
          ]);
        if (debt === undefined || interest === undefined) return fundPass();
        if (debt <= 0 && interest > 0) {
          return fundFail({
            field: "interestExpense",
            message: "Interest expense present with zero/negative debt.",
            recommendation: "Reconcile debt and interest line items.",
            actual: { debt, interest },
          });
        }
        if (debt > 0 && interest < 0) {
          return fundFail({
            field: "interestExpense",
            message: "Negative interest expense with positive debt is suspicious.",
            recommendation: "Verify interest sign convention.",
            actual: { debt, interest },
          });
        }
        return fundPass();
      },
    },
    {
      id: "cross.revenue_profit_growth",
      name: "Revenue vs Profit Growth",
      description: "Extreme profit growth without revenue support raises warning.",
      category: "FUNDAMENTAL",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["fundamental", "cross", "growth"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const growth = section(ctx.data, ["growth"]);
        const revG =
          readNumber(growth, ["revenueGrowth"]) ??
          readNumber(ctx.data as Record<string, unknown>, ["revenueGrowth"]);
        const patG =
          readNumber(growth, ["profitGrowth", "patGrowth"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "profitGrowth",
            "patGrowth",
          ]);
        if (revG === undefined || patG === undefined) return fundPass();
        if (revG < 5 && patG > 100) {
          return fundFail({
            field: "profitGrowth",
            message: "Profit growth far exceeds revenue growth.",
            recommendation: "Investigate one-offs / accounting changes.",
            actual: { revenueGrowth: revG, profitGrowth: patG },
          });
        }
        return fundPass();
      },
    },
    {
      id: "cross.dividend_cashflow",
      name: "Dividend vs Cash Flow",
      description: "Dividend payout should be supported by cash flow.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["fundamental", "cross"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const cf = section(ctx.data, ["cashFlow", "cf"]);
        const dividends =
          readNumber(cf, ["dividendsPaid", "dividendPayout"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "dividendsPaid",
            "dividendPayout",
          ]);
        const fcf =
          readNumber(cf, ["freeCashFlow", "fcf"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "freeCashFlow",
            "fcf",
          ]);
        const ocf =
          readNumber(cf, ["operatingCashFlow", "ocf"]) ??
          readNumber(ctx.data as Record<string, unknown>, [
            "operatingCashFlow",
            "ocf",
          ]);
        if (dividends === undefined || dividends <= 0) return fundPass();
        const support = fcf ?? ocf;
        if (support !== undefined && support > 0 && dividends > support * 2) {
          return fundFail({
            field: "dividendsPaid",
            message: "Dividend payout exceeds supporting cash flow.",
            recommendation: "Review dividend sustainability.",
            expected: `<= 2x cash flow support`,
            actual: { dividends, support },
          });
        }
        return fundPass();
      },
    },
    {
      id: "cross.cashflow_balancesheet",
      name: "Cash Flow vs Balance Sheet Cash",
      description: "Cash reconciliation across CF and Balance Sheet.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["fundamental", "cross"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const bs = section(ctx.data, ["balanceSheet", "bs"]);
        const cf = section(ctx.data, ["cashFlow", "cf"]);
        const closingCf = readNumber(cf, ["closingCash", "endingCash"]);
        const cashBs = readNumber(bs, ["cash", "cashAndEquivalents"]);
        if (closingCf === undefined || cashBs === undefined) return fundPass();
        if (
          Math.abs(closingCf - cashBs) >
          Math.max(config.cashReconciliationTolerance, 1)
        ) {
          return fundFail({
            field: "cash",
            message: "Balance-sheet cash does not match CF closing cash.",
            recommendation: "Reconcile cash across statements.",
            expected: closingCf,
            actual: cashBs,
          });
        }
        return fundPass();
      },
    },
  ];
}
