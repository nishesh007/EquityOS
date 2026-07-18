/**
 * Quality Compounder Financial Strength Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderCurrentSnapshot,
  QualityCompounderFinancialAnalysis,
  QualityCompounderYearlyFinancials,
} from "./QualityCompounderTypes";
import {
  coefficientOfVariation,
  sortFinancialHistory,
} from "./QualityCompounderUtils";

export function analyzeFinancialStrength(
  history: readonly QualityCompounderYearlyFinancials[],
  current: QualityCompounderCurrentSnapshot,
  config: QualityCompounderConfig
): QualityCompounderFinancialAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const sorted = sortFinancialHistory(history);

  const consistentRoe =
    current.roe >= config.minRoe &&
    coefficientOfVariation(
      sorted.map((y) => y.roe ?? current.roe).filter((v) => v > 0)
    ) <= config.maxEarningsCv;
  const consistentRoce =
    current.roce >= config.minRoce &&
    coefficientOfVariation(
      sorted.map((y) => y.roce ?? current.roce).filter((v) => v > 0)
    ) <= config.maxEarningsCv;
  const positiveRoic = current.roic >= config.minRoic;
  const positiveFcf = current.freeCashFlow > 0;
  const lowDebt = current.debtEquity <= config.maxDebtEquity;
  const healthyLiquidity = current.currentRatio >= config.minCurrentRatio;
  const interestOk = current.interestCoverage >= config.minInterestCoverage;
  const healthyBalanceSheet = lowDebt && healthyLiquidity && interestOk;

  const margins = sorted
    .map((y) => y.operatingMargin ?? current.operatingMargin)
    .filter((v) => Number.isFinite(v));
  const stableMargins =
    margins.length < 3 ||
    coefficientOfVariation(margins) <= config.maxRevenueCv;

  const fcfPositiveYears = sorted.filter((y) => y.freeCashFlow > 0).length;
  const cashFlowQuality = clamp(
    round((fcfPositiveYears / Math.max(sorted.length, 1)) * 100, 1),
    0,
    100
  );

  let score = 30;
  if (consistentRoe) score += 12;
  if (consistentRoce) score += 12;
  if (positiveRoic) score += 12;
  if (positiveFcf) score += 10;
  if (healthyBalanceSheet) score += 12;
  if (stableMargins) score += 8;
  score = clamp(
    round(score * 0.75 + cashFlowQuality * 0.25, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (healthyBalanceSheet && positiveFcf) {
    reasons.push("Balance sheet remains exceptionally strong.");
  }
  if (positiveRoic) {
    reasons.push("ROIC has remained consistently above the cost of capital.");
  }
  if (!positiveFcf) warnings.push("Weak Cash Flow.");
  if (!lowDebt) warnings.push("High Debt.");
  if (!positiveRoic) warnings.push("Declining ROIC.");

  return {
    score,
    consistentRoe,
    consistentRoce,
    positiveRoic,
    positiveFcf,
    healthyBalanceSheet,
    lowDebt,
    healthyLiquidity,
    stableMargins,
    cashFlowQuality,
    reasons,
    warnings,
  };
}
