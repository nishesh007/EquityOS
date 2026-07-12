/**
 * Balance sheet analysis — leverage, liquidity, and financial strength scoring.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import type { FinancialRatios, FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface BalanceSheetMetrics {
  debtEquity: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  financialStrength: number;
}

function latestAnnual(periods: FinancialStatementPeriod[]): FinancialStatementPeriod | undefined {
  return periods.filter((period) => period.periodType === "annual").at(-1);
}

function scoreDebt(debtToEquity: number | null, isBanking: boolean): number {
  if (debtToEquity === null) return 55;
  const threshold = isBanking ? 7 : 0.8;
  if (debtToEquity <= threshold * 0.5) return 92;
  if (debtToEquity <= threshold) return normalizeScore(78 - (debtToEquity - threshold * 0.5) * 18);
  return normalizeScore(52 - (debtToEquity - threshold) * 14);
}

function scoreLiquidity(currentRatio: number | null, quickRatio: number | null): number {
  const current = currentRatio ?? 0;
  const quick = quickRatio ?? current * 0.75;
  if (current >= 2 && quick >= 1) return 90;
  if (current >= 1.5 && quick >= 0.8) return 78;
  if (current >= 1) return normalizeScore(55 + (current - 1) * 30);
  return normalizeScore(35 + current * 25);
}

function scoreInterestCoverage(coverage: number | null): number {
  if (coverage === null) return 58;
  if (coverage >= 10) return 94;
  if (coverage >= 5) return normalizeScore(72 + (coverage - 5) * 4);
  if (coverage >= 2) return normalizeScore(48 + (coverage - 2) * 8);
  return normalizeScore(22 + coverage * 12);
}

export function computeBalanceSheetMetrics(input: {
  balance: FinancialStatementPeriod[];
  income: FinancialStatementPeriod[];
  ratios: FinancialRatios;
  sector: string;
}): BalanceSheetMetrics {
  const { balance, income, ratios, sector } = input;
  const isBanking = sector === "Banking";
  const latestBalance = latestAnnual(balance);
  const latestIncome = latestAnnual(income);

  let debtEquity = safeMetric(ratios.debtToEquity);
  let currentRatio = safeMetric(ratios.currentRatio);
  let interestCoverage = safeMetric(ratios.interestCoverage);

  if (latestBalance) {
    const totalEquity = findStatementValue(latestBalance, "totalEquity", "totalStockholdersEquity");
    const totalDebt = findStatementValue(latestBalance, "totalDebt", "longTermDebt");
    const currentAssets = findStatementValue(latestBalance, "totalCurrentAssets");
    const currentLiabilities = findStatementValue(latestBalance, "totalCurrentLiabilities");
    const inventory = findStatementValue(latestBalance, "inventory", "Inventory");

    if (totalEquity > 0 && debtEquity === null) {
      debtEquity = round(totalDebt / totalEquity, 2);
    }
    if (currentLiabilities > 0 && currentRatio === null) {
      currentRatio = round(currentAssets / currentLiabilities, 2);
    }

    const quickAssets = currentAssets - inventory;
    const quickRatio =
      currentLiabilities > 0 ? round(quickAssets / currentLiabilities, 2) : null;

    if (latestIncome && interestCoverage === null) {
      const ebit = findStatementValue(latestIncome, "operatingIncome", "ebit", "EBIT");
      const interest = findStatementValue(latestIncome, "interestExpense", "Interest Expense");
      if (interest > 0) interestCoverage = round(ebit / interest, 1);
    }

    const debtScore = scoreDebt(debtEquity, isBanking);
    const liquidityScore = scoreLiquidity(currentRatio, quickRatio);
    const coverageScore = scoreInterestCoverage(interestCoverage);

    return {
      debtEquity,
      interestCoverage,
      currentRatio,
      quickRatio,
      financialStrength: normalizeScore(debtScore * 0.4 + liquidityScore * 0.35 + coverageScore * 0.25),
    };
  }

  const debtScore = scoreDebt(debtEquity, isBanking);
  const liquidityScore = scoreLiquidity(currentRatio, null);
  const coverageScore = scoreInterestCoverage(interestCoverage);

  return {
    debtEquity,
    interestCoverage,
    currentRatio,
    quickRatio: currentRatio !== null ? round(currentRatio * 0.82, 2) : null,
    financialStrength: normalizeScore(debtScore * 0.4 + liquidityScore * 0.35 + coverageScore * 0.25),
  };
}
