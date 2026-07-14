/**
 * Cash flow statement validation rules.
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

export function createCashFlowValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "cf.core_statement",
      name: "Cash Flow Core",
      description:
        "Validate OCF/ICF/FCF components, net cash, CapEx and dividend consistency.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "cash-flow"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const config = configFromContext(ctx);
        const cf = section(ctx.data, ["cashFlow", "cash_flow", "cf"]);

        const ocf = readNumber(cf, [
          "operatingCashFlow",
          "cashFromOperations",
          "ocf",
        ]);
        const icf = readNumber(cf, [
          "investingCashFlow",
          "cashFromInvesting",
          "icf",
        ]);
        const fcfFin = readNumber(cf, [
          "financingCashFlow",
          "cashFromFinancing",
          "fcfFinancing",
        ]);
        const freeCashFlow = readNumber(cf, ["freeCashFlow", "fcf"]);
        const netCash = readNumber(cf, ["netCashFlow", "netChangeInCash"]);
        const capex = readNumber(cf, ["capex", "capitalExpenditure"]);
        const dividends = readNumber(cf, ["dividendsPaid", "dividendPayout"]);

        for (const [field, value] of [
          ["operatingCashFlow", ocf],
          ["investingCashFlow", icf],
          ["financingCashFlow", fcfFin],
          ["freeCashFlow", freeCashFlow],
          ["netCashFlow", netCash],
        ] as const) {
          if (value === undefined) continue;
          if (!Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is non-finite.`,
              recommendation: "Reject corrupted cash-flow field.",
              actual: value,
            });
          }
        }

        if (
          ocf !== undefined &&
          icf !== undefined &&
          fcfFin !== undefined &&
          netCash !== undefined
        ) {
          const expected = ocf + icf + fcfFin;
          if (
            Math.abs(expected - netCash) >
            Math.max(
              config.cashReconciliationTolerance,
              Math.abs(expected) * 0.02
            )
          ) {
            return fundFail({
              field: "netCashFlow",
              message: "Net cash flow does not reconcile with OCF+ICF+FCF.",
              recommendation: "Reconcile cash-flow statement totals.",
              expected,
              actual: netCash,
            });
          }
        }

        if (
          ocf !== undefined &&
          capex !== undefined &&
          freeCashFlow !== undefined
        ) {
          // CapEx often stored as negative outflow; FCF ≈ OCF - |CapEx|
          const expected = ocf - Math.abs(capex);
          if (
            Math.abs(expected - freeCashFlow) >
            Math.max(
              config.cashReconciliationTolerance,
              Math.abs(expected) * 0.05
            )
          ) {
            return fundFail({
              field: "freeCashFlow",
              message: "Free cash flow inconsistent with OCF and CapEx.",
              recommendation: "Set FCF = OCF - |CapEx| (or documented variant).",
              expected,
              actual: freeCashFlow,
            });
          }
        }

        if (dividends !== undefined && dividends > 0 && ocf !== undefined) {
          if (dividends > Math.abs(ocf) * 5 && ocf <= 0) {
            return fundFail({
              field: "dividendsPaid",
              message: "Dividend payout inconsistent with operating cash flow.",
              recommendation: "Verify dividend funding source.",
              expected: "dividends supported by cash generation",
              actual: { dividends, ocf },
            });
          }
        }

        const opening = readNumber(cf, ["openingCash", "beginningCash"]);
        const closing = readNumber(cf, ["closingCash", "endingCash"]);
        if (
          opening !== undefined &&
          closing !== undefined &&
          netCash !== undefined
        ) {
          const expected = opening + netCash;
          if (
            Math.abs(expected - closing) >
            Math.max(config.cashReconciliationTolerance, 1)
          ) {
            return fundFail({
              field: "cashReconciliation",
              message: "Closing cash does not reconcile with opening + net change.",
              recommendation: "Fix cash reconciliation identity.",
              expected,
              actual: closing,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
