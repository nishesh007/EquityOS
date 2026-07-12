/**
 * Piotroski F-Score — 9-point financial strength model.
 * Returns raw score 0–9; normalized 0–100 available via normalizePiotroskiScore.
 */

import { findStatementValue } from "@/lib/fundamentals/normalize";
import { normalizeScore } from "@/lib/fundamentals/registry";
import type { FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface PiotroskiResult {
  rawScore: number | null;
  normalizedScore: number | null;
  signals: string[];
}

function annualPeriods(periods: FinancialStatementPeriod[]): FinancialStatementPeriod[] {
  return periods
    .filter((period) => period.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date));
}

function roaFromPeriod(income: FinancialStatementPeriod, balance: FinancialStatementPeriod): number {
  const netIncome = findStatementValue(income, "netIncome", "netProfit", "Net Income");
  const totalAssets = findStatementValue(balance, "totalAssets");
  return totalAssets > 0 ? netIncome / totalAssets : 0;
}

export function computePiotroskiScore(input: {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  cashflow: FinancialStatementPeriod[];
  fallbackRoa?: number;
}): PiotroskiResult {
  const incomePeriods = annualPeriods(input.income);
  const balancePeriods = annualPeriods(input.balance);
  const cashflowPeriods = annualPeriods(input.cashflow);

  if (incomePeriods.length < 2 || balancePeriods.length < 2) {
    if (input.fallbackRoa !== undefined) {
      const raw = input.fallbackRoa > 0.05 ? 5 : input.fallbackRoa > 0 ? 3 : 2;
      return {
        rawScore: raw,
        normalizedScore: normalizeScore((raw / 9) * 100),
        signals: ["Estimated from available ratios — insufficient statement history"],
      };
    }
    return { rawScore: null, normalizedScore: null, signals: [] };
  }

  const currentIncome = incomePeriods.at(-1)!;
  const priorIncome = incomePeriods.at(-2)!;
  const currentBalance = balancePeriods.at(-1)!;
  const priorBalance = balancePeriods.at(-2)!;
  const currentCash = cashflowPeriods.at(-1);

  const signals: string[] = [];
  let score = 0;

  const currentRoa = roaFromPeriod(currentIncome, currentBalance);
  const priorRoa = roaFromPeriod(priorIncome, priorBalance);
  if (currentRoa > 0) {
    score += 1;
    signals.push("Positive ROA");
  }

  const ocf = currentCash
    ? findStatementValue(
        currentCash,
        "operatingCashFlow",
        "netCashProvidedByOperatingActivities",
        "Operating Cash Flow"
      )
    : 0;
  if (ocf > 0) {
    score += 1;
    signals.push("Positive operating cash flow");
  }

  if (currentRoa > priorRoa) {
    score += 1;
    signals.push("Improving ROA");
  }

  const netIncome = findStatementValue(currentIncome, "netIncome", "netProfit", "Net Income");
  if (ocf > netIncome) {
    score += 1;
    signals.push("Quality of earnings (OCF > NI)");
  }

  const currentDebt = findStatementValue(currentBalance, "totalDebt", "longTermDebt");
  const priorDebt = findStatementValue(priorBalance, "totalDebt", "longTermDebt");
  const currentAssets = findStatementValue(currentBalance, "totalAssets");
  const priorAssets = findStatementValue(priorBalance, "totalAssets");
  const currentLev = currentAssets > 0 ? currentDebt / currentAssets : 1;
  const priorLev = priorAssets > 0 ? priorDebt / priorAssets : 1;
  if (currentLev < priorLev) {
    score += 1;
    signals.push("Lower leverage ratio");
  }

  const currentCa = findStatementValue(currentBalance, "totalCurrentAssets");
  const currentCl = findStatementValue(currentBalance, "totalCurrentLiabilities");
  const priorCa = findStatementValue(priorBalance, "totalCurrentAssets");
  const priorCl = findStatementValue(priorBalance, "totalCurrentLiabilities");
  const currentCr = currentCl > 0 ? currentCa / currentCl : 0;
  const priorCr = priorCl > 0 ? priorCa / priorCl : 0;
  if (currentCr > priorCr) {
    score += 1;
    signals.push("Improving current ratio");
  }

  const currentShares = findStatementValue(
    currentBalance,
    "commonStockSharesOutstanding",
    "sharesOutstanding"
  );
  const priorShares = findStatementValue(
    priorBalance,
    "commonStockSharesOutstanding",
    "sharesOutstanding"
  );
  if (currentShares > 0 && priorShares > 0 && currentShares <= priorShares) {
    score += 1;
    signals.push("No dilution");
  }

  const currentRev = findStatementValue(currentIncome, "revenue", "totalRevenue", "Revenue");
  const priorRev = findStatementValue(priorIncome, "revenue", "totalRevenue", "Revenue");
  const currentGp = findStatementValue(currentIncome, "grossProfit", "Gross Profit");
  const priorGp = findStatementValue(priorIncome, "grossProfit", "Gross Profit");
  const currentGm = currentRev > 0 ? currentGp / currentRev : 0;
  const priorGm = priorRev > 0 ? priorGp / priorRev : 0;
  if (currentGm > priorGm) {
    score += 1;
    signals.push("Improving gross margin");
  }

  const currentTurnover = currentAssets > 0 ? currentRev / currentAssets : 0;
  const priorTurnover = priorAssets > 0 ? priorRev / priorAssets : 0;
  if (currentTurnover > priorTurnover) {
    score += 1;
    signals.push("Improving asset turnover");
  }

  return {
    rawScore: score,
    normalizedScore: normalizeScore((score / 9) * 100),
    signals,
  };
}
