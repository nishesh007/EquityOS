/**
 * Profitability analysis — margins and return metrics with composite score.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import type { FinancialRatios, FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface ProfitabilityMetrics {
  operatingMargin: number | null;
  netMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  roce: number | null;
  roa: number | null;
  eps: number | null;
  dilutedEps: number | null;
  profitabilityScore: number;
}

function latestAnnual(periods: FinancialStatementPeriod[]): FinancialStatementPeriod | undefined {
  return periods.filter((period) => period.periodType === "annual").at(-1);
}

function scoreReturn(value: number | null, excellent = 20, good = 15): number {
  if (value === null) return 50;
  if (value >= excellent) return normalizeScore(82 + (value - excellent) * 1.2);
  if (value >= good) return normalizeScore(58 + (value - good) * 4.8);
  if (value >= 10) return normalizeScore(38 + (value - 10) * 4);
  return normalizeScore(22 + value * 1.6);
}

function scoreMargin(value: number | null): number {
  if (value === null) return 50;
  if (value >= 25) return 92;
  if (value >= 15) return normalizeScore(68 + (value - 15) * 2.4);
  if (value >= 8) return normalizeScore(48 + (value - 8) * 2.8);
  return normalizeScore(28 + value * 2.5);
}

export function computeProfitabilityMetrics(input: {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  ratios: FinancialRatios;
  fallbackRoe: number;
  fallbackRoce: number;
}): ProfitabilityMetrics {
  const { income, balance, ratios, fallbackRoe, fallbackRoce } = input;
  const latestIncome = latestAnnual(income);
  const latestBalance = latestAnnual(balance);

  let operatingMargin = safeMetric(ratios.operatingMargin);
  let netMargin = safeMetric(ratios.netMargin);
  let grossMargin = safeMetric(ratios.grossMargin);
  let roe = safeMetric(ratios.roe) ?? (fallbackRoe > 0 ? fallbackRoe : null);
  let roce = safeMetric(ratios.roce) ?? (fallbackRoce > 0 ? fallbackRoce : null);
  let roa = safeMetric(ratios.roa);
  let eps = safeMetric(ratios.eps);
  let dilutedEps = safeMetric(ratios.eps);

  if (latestIncome) {
    const revenue = findStatementValue(latestIncome, "revenue", "totalRevenue", "Revenue");
    const netIncome = findStatementValue(latestIncome, "netIncome", "netProfit", "Net Income");
    const grossProfit = findStatementValue(latestIncome, "grossProfit", "Gross Profit");
    const operatingIncome = findStatementValue(latestIncome, "operatingIncome", "ebit", "EBITDA");
    const diluted = findStatementValue(latestIncome, "epsDiluted", "dilutedEps", "EPS");

    if (revenue > 0) {
      if (operatingMargin === null && operatingIncome !== 0) {
        operatingMargin = round((operatingIncome / revenue) * 100, 1);
      }
      if (netMargin === null && netIncome !== 0) {
        netMargin = round((netIncome / revenue) * 100, 1);
      }
      if (grossMargin === null && grossProfit !== 0) {
        grossMargin = round((grossProfit / revenue) * 100, 1);
      }
    }

    if (eps === null) {
      const basicEps = findStatementValue(latestIncome, "eps", "EPS");
      eps = basicEps !== 0 ? basicEps : null;
    }
    if (diluted !== 0) dilutedEps = diluted;
  }

  if (latestBalance && latestIncome) {
    const netIncome = findStatementValue(latestIncome, "netIncome", "netProfit", "Net Income");
    const totalEquity = findStatementValue(latestBalance, "totalEquity", "totalStockholdersEquity");
    const totalAssets = findStatementValue(latestBalance, "totalAssets");
    const totalDebt = findStatementValue(latestBalance, "totalDebt", "longTermDebt");
    const cash = findStatementValue(latestBalance, "cashAndCashEquivalents", "Cash");

    if (totalEquity > 0 && roe === null) roe = round((netIncome / totalEquity) * 100, 1);
    if (totalAssets > 0 && roa === null) roa = round((netIncome / totalAssets) * 100, 1);

    const capitalEmployed = totalEquity + totalDebt - cash;
    if (capitalEmployed > 0 && roce === null) {
      const ebit = findStatementValue(latestIncome, "operatingIncome", "ebit", "EBIT");
      roce = round((ebit / capitalEmployed) * 100, 1);
    }
  }

  const marginScore = normalizeScore(
    (scoreMargin(grossMargin) + scoreMargin(operatingMargin) + scoreMargin(netMargin)) / 3
  );
  const returnScore = normalizeScore(
    (scoreReturn(roe) + scoreReturn(roce) + scoreReturn(roa, 12, 8)) / 3
  );

  return {
    operatingMargin,
    netMargin,
    grossMargin,
    roe,
    roce,
    roa,
    eps,
    dilutedEps,
    profitabilityScore: normalizeScore(marginScore * 0.45 + returnScore * 0.55),
  };
}
