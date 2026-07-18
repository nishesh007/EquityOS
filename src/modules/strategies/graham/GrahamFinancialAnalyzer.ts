/**
 * Graham Financial Analyzer — Sprint 11B.3V.
 * Earnings, cash flow, dividend and book-value screens.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { GrahamConfig } from "./GrahamConstants";
import type {
  GrahamCurrentSnapshot,
  GrahamFinancialAnalysis,
  GrahamScreenBreakdown,
  GrahamYearlyFinancials,
} from "./GrahamTypes";
import {
  average,
  classifyScreen,
  coefficientOfVariation,
  sortFinancialHistory,
} from "./GrahamUtils";

export function analyzeFinancialStrength(
  history: readonly GrahamYearlyFinancials[],
  current: GrahamCurrentSnapshot,
  config: GrahamConfig
): GrahamFinancialAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const sorted = sortFinancialHistory(history);

  const epsSeries = sorted.map((y) => y.eps);
  const fcfSeries = sorted.map((y) => y.freeCashFlow);
  const ocfSeries = sorted.map((y) => y.operatingCashFlow);
  const bookSeries = sorted.map((y) => y.bookValue);

  const latestEps = epsSeries.length > 0 ? epsSeries[epsSeries.length - 1]! : 0;
  const positiveEarnings =
    latestEps > 0 &&
    (current.operatingCashFlow > 0 || average(epsSeries.slice(-3)) > 0);
  const positiveFcf =
    current.freeCashFlow > 0 &&
    average(fcfSeries.slice(-3).filter((v) => Number.isFinite(v))) > 0;
  const positiveOcf = current.operatingCashFlow > 0;

  const earningsCv = coefficientOfVariation(
    epsSeries.filter((v) => v > 0)
  );
  const earningsStability = clamp(round(100 - earningsCv * 80, 1), 0, 100);

  const fcfPositiveYears = fcfSeries.filter((v) => v > 0).length;
  const cashFlowQuality = clamp(
    round((fcfPositiveYears / Math.max(fcfSeries.length, 1)) * 100, 1),
    0,
    100
  );

  const earningsScreen = classifyScreen(
    positiveEarnings && earningsStability >= 55,
    positiveEarnings,
    config
  );
  const cashFlowScreen = classifyScreen(
    positiveFcf && positiveOcf,
    positiveOcf || positiveFcf,
    config
  );

  const dividendYears = current.dividendHistoryYears;
  const dividendScreen = classifyScreen(
    dividendYears >= Math.max(config.minDividendYears, 5) ||
      dividendYears >= sorted.length,
    dividendYears >= config.minDividendYears,
    config
  );

  let bookGrowthPass = false;
  let bookGrowthBorder = false;
  if (bookSeries.length >= 3) {
    const first = bookSeries[0]!;
    const last = bookSeries[bookSeries.length - 1]!;
    if (first > 0) {
      const growth = (last - first) / first;
      bookGrowthPass = growth >= 0.15;
      bookGrowthBorder = growth >= 0;
    }
  }
  const bookScreen = classifyScreen(bookGrowthPass, bookGrowthBorder, config);

  const currentRatioScreen = classifyScreen(
    current.currentRatio >= config.minCurrentRatio,
    current.currentRatio >= config.minCurrentRatio * 0.75,
    config
  );
  const quickRatioScreen = classifyScreen(
    current.quickRatio >= config.minQuickRatio,
    current.quickRatio >= config.minQuickRatio * 0.75,
    config
  );
  const debtScreen = classifyScreen(
    current.debtEquity <= config.maxDebtEquity,
    current.debtEquity <= config.maxDebtEquity * 1.25,
    config
  );
  const interestScreen = classifyScreen(
    current.interestCoverage >= config.minInterestCoverage,
    current.interestCoverage >= config.minInterestCoverage * 0.7,
    config
  );
  const wcOk =
    !config.minWorkingCapitalPositive || current.workingCapital > 0;
  const wcScreen = classifyScreen(
    wcOk && current.workingCapital > 0,
    current.workingCapital >= 0,
    config
  );

  const screenScores = [
    currentRatioScreen.score,
    quickRatioScreen.score,
    debtScreen.score,
    interestScreen.score,
    earningsScreen.score,
    cashFlowScreen.score,
    dividendScreen.score,
    bookScreen.score,
    wcScreen.score,
  ];
  const avgScreen = average(screenScores);
  const financialStrengthScreen = classifyScreen(
    avgScreen >= 75,
    avgScreen >= 50,
    config
  );

  const screens: GrahamScreenBreakdown = {
    financialStrength: financialStrengthScreen.result,
    currentRatio: currentRatioScreen.result,
    quickRatio: quickRatioScreen.result,
    debtEquity: debtScreen.result,
    interestCoverage: interestScreen.result,
    positiveEarnings: earningsScreen.result,
    positiveCashFlow: cashFlowScreen.result,
    dividendConsistency: dividendScreen.result,
    bookValueGrowth: bookScreen.result,
    workingCapital: wcScreen.result,
  };

  const score = clamp(
    round(
      avgScreen * 0.7 +
        earningsStability * 0.15 +
        cashFlowQuality * 0.15,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (positiveFcf) {
    reasons.push("Free cash flow remains consistently positive.");
  }
  if (!positiveEarnings) warnings.push("Negative or weak earnings.");
  if (!positiveFcf) warnings.push("Negative Free Cash Flow.");

  return {
    score,
    screens,
    positiveEarnings,
    positiveFcf,
    positiveOcf,
    earningsStability,
    cashFlowQuality,
    reasons,
    warnings,
  };
}
