/**
 * Magic Formula Financial Strength Analyzer — Sprint 11B.3X.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import type {
  MagicFormulaCurrentSnapshot,
  MagicFormulaFinancialAnalysis,
  MagicFormulaYearlyFinancials,
} from "./MagicFormulaTypes";
import { sortFinancialHistory } from "./MagicFormulaUtils";

export function analyzeFinancialStrength(
  history: readonly MagicFormulaYearlyFinancials[],
  current: MagicFormulaCurrentSnapshot,
  config: MagicFormulaConfig
): MagicFormulaFinancialAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const sorted = sortFinancialHistory(history);

  const ebit = current.ebit > 0 ? current.ebit : current.operatingIncome;
  const positiveEbit = ebit > 0;
  const positiveOcf = current.operatingCashFlow > 0;
  const positiveFcf = current.freeCashFlow > 0;
  const reasonableDebt = current.debtEquity <= config.maxDebtEquity;
  const liquidityOk = current.currentRatio >= config.minCurrentRatio;
  const workingCapitalOk =
    !config.rejectNegativeWorkingCapital || current.workingCapital >= 0;

  const profitableYears = sorted.filter(
    (y) => y.ebit > 0 || y.netIncome > 0
  ).length;
  const consistentProfitability =
    sorted.length === 0
      ? positiveEbit
      : profitableYears / sorted.length >= config.minProfitableYearsRatio;

  const fcfPositiveYears = sorted.filter((y) => y.freeCashFlow > 0).length;
  const cashFlowQuality = clamp(
    round((fcfPositiveYears / Math.max(sorted.length, 1)) * 100, 1),
    0,
    100
  );

  const healthyBalanceSheet =
    reasonableDebt && liquidityOk && workingCapitalOk && positiveOcf;

  let score = 35;
  if (positiveEbit) score += 12;
  if (positiveOcf) score += 10;
  if (positiveFcf) score += 10;
  if (reasonableDebt) score += 10;
  if (workingCapitalOk) score += 8;
  if (consistentProfitability) score += 8;
  if (healthyBalanceSheet) score += 7;
  score = clamp(
    round(score * 0.75 + cashFlowQuality * 0.25, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (positiveOcf && positiveFcf) {
    reasons.push("Strong operating cash flow supports earnings quality.");
  }
  if (healthyBalanceSheet) {
    reasons.push(
      "Financial strength and governance satisfy institutional filters."
    );
  }
  if (!positiveEbit) warnings.push("Negative EBIT.");
  if (!positiveFcf) warnings.push("Negative Cash Flow.");
  if (!reasonableDebt) warnings.push("Extreme Debt.");
  if (!workingCapitalOk) warnings.push("Negative Working Capital.");
  if (!consistentProfitability) warnings.push("Persistent Losses.");

  return {
    score,
    positiveEbit,
    positiveOcf,
    positiveFcf,
    healthyBalanceSheet,
    reasonableDebt,
    workingCapitalOk,
    consistentProfitability,
    cashFlowQuality,
    reasons,
    warnings,
  };
}
