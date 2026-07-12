/**
 * Cash flow analysis — FCF, conversion, and margin metrics.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { safeMetric } from "@/lib/fundamentals/registry";
import type { FinancialRatios, FinancialStatementPeriod } from "@/lib/fundamentals/types";

const CRORE = 10_000_000;

export interface CashflowMetrics {
  fcfCr: number | null;
  cashConversion: number | null;
  fcfMargin: number | null;
}

function latestAnnual(periods: FinancialStatementPeriod[]): FinancialStatementPeriod | undefined {
  return periods.filter((period) => period.periodType === "annual").at(-1);
}

export function computeCashflowMetrics(input: {
  cashflow: FinancialStatementPeriod[];
  income: FinancialStatementPeriod[];
  ratios: FinancialRatios;
  netProfitCr: number;
  revenueCr: number;
  roce: number;
}): CashflowMetrics {
  const { cashflow, income, ratios, netProfitCr, revenueCr, roce } = input;
  const latestCash = latestAnnual(cashflow);
  const latestIncome = latestAnnual(income);

  let fcfCr: number | null = null;

  if (ratios.freeCashFlow !== undefined && Number.isFinite(ratios.freeCashFlow)) {
    fcfCr = round(ratios.freeCashFlow / CRORE);
  } else if (latestCash) {
    const fcf = findStatementValue(latestCash, "freeCashFlow", "Free Cash Flow", "fcf");
    if (fcf !== 0) fcfCr = round(fcf);
  }

  if (fcfCr === null && latestCash && latestIncome) {
    const ocf = findStatementValue(
      latestCash,
      "operatingCashFlow",
      "netCashProvidedByOperatingActivities",
      "Operating Cash Flow"
    );
    const capex = Math.abs(
      findStatementValue(
        latestCash,
        "capitalExpenditure",
        "Capital Expenditure",
        "investmentsInPropertyPlantAndEquipment"
      )
    );
    if (ocf !== 0) fcfCr = round(ocf - capex);
  }

  if (fcfCr === null && revenueCr > 0) {
    const operatingCashFlow = Math.round(revenueCr * (0.1 + Math.min(roce, 30) / 300));
    fcfCr = Math.round(operatingCashFlow * (0.48 + Math.min(roce, 30) / 100));
  }

  const cashConversion =
    fcfCr !== null && netProfitCr > 0
      ? round((fcfCr / netProfitCr) * 100, 1)
      : fcfCr !== null && netProfitCr <= 0
        ? safeMetric(fcfCr > 0 ? 65 : 25)
        : null;

  const fcfMargin =
    fcfCr !== null && revenueCr > 0 ? round((fcfCr / revenueCr) * 100, 1) : null;

  return { fcfCr, cashConversion, fcfMargin };
}
