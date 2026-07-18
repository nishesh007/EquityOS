/**
 * Buffett Financial Strength Analyzer — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettConfig } from "./BuffettConstants";
import type {
  BuffettCurrentSnapshot,
  BuffettFinancialAnalysis,
  BuffettYearlyFinancials,
} from "./BuffettTypes";
import {
  coefficientOfVariation,
  growthSeries,
  sortFinancialHistory,
} from "./BuffettUtils";

export function analyzeFinancialStrength(
  history: readonly BuffettYearlyFinancials[],
  current: BuffettCurrentSnapshot,
  config: BuffettConfig
): BuffettFinancialAnalysis {
  const sorted = sortFinancialHistory(history);
  const reasons: string[] = [];
  const warnings: string[] = [];

  const roeOk = current.roe >= config.minRoe;
  const roceOk = current.roce >= config.minRoce;
  const roicOk = current.roic >= config.minRoic;
  const debtOk = current.debtEquity <= config.maxDebtEquity;
  const positiveFcf = sorted.every((y) => y.freeCashFlow >= 0) ||
    sorted.slice(-3).every((y) => y.freeCashFlow > 0);
  const positiveOcf = sorted.slice(-3).every((y) => y.operatingCashFlow > 0);
  const healthyMargins =
    current.grossMargin >= config.minGrossMargin &&
    current.operatingMargin >= config.minOperatingMargin &&
    current.netMargin >= config.minNetMargin;

  const epsGrowthCv = coefficientOfVariation(
    growthSeries(sorted.map((y) => y.eps))
  );
  const consistentEarnings = epsGrowthCv <= config.maxEarningsCv;

  const balanceSheetScore = clamp(
    round(
      (debtOk ? 30 : 5) +
        (current.currentRatio >= config.minCurrentRatio ? 25 : 8) +
        (current.interestCoverage >= config.minInterestCoverage ? 25 : 8) +
        (debtOk && current.debtEquity < config.maxDebtEquity * 0.5 ? 20 : 5),
      1
    ),
    0,
    100
  );

  let score = 40;
  if (roeOk) score += 12;
  if (roceOk) score += 12;
  if (roicOk) score += 10;
  if (debtOk) score += 10;
  if (positiveFcf) score += 8;
  if (positiveOcf) score += 6;
  if (healthyMargins) score += 6;
  if (consistentEarnings) score += 6;
  score = clamp(round(score * 0.7 + balanceSheetScore * 0.3, 1), 0, 100);

  if (roeOk && roceOk) {
    reasons.push("ROE and ROCE have remained consistently strong.");
  }
  if (!positiveFcf) warnings.push("Negative Free Cash Flow.");
  if (!debtOk) warnings.push("High debt.");
  if (!consistentEarnings) warnings.push("Unpredictable earnings.");
  if (!healthyMargins) warnings.push("Weak margins.");

  return {
    score,
    balanceSheetScore,
    roeOk,
    roceOk,
    roicOk,
    debtOk,
    positiveFcf,
    consistentEarnings,
    healthyMargins,
    positiveOcf,
    reasons,
    warnings,
  };
}
