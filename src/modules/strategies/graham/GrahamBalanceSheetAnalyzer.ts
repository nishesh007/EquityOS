/**
 * Graham Balance Sheet Analyzer — Sprint 11B.3V.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { GrahamConfig } from "./GrahamConstants";
import type {
  GrahamBalanceSheetAnalysis,
  GrahamCurrentSnapshot,
} from "./GrahamTypes";

export function analyzeBalanceSheet(
  current: GrahamCurrentSnapshot,
  config: GrahamConfig
): GrahamBalanceSheetAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const currentRatioOk = current.currentRatio >= config.minCurrentRatio;
  const quickRatioOk = current.quickRatio >= config.minQuickRatio;
  const debtOk = current.debtEquity <= config.maxDebtEquity;
  const interestCoverageOk =
    current.interestCoverage >= config.minInterestCoverage;
  const workingCapitalOk =
    !config.minWorkingCapitalPositive || current.workingCapital > 0;

  const liquidityScore = clamp(
    round(
      (Math.min(current.currentRatio / config.minCurrentRatio, 2) * 40 +
        Math.min(current.quickRatio / config.minQuickRatio, 2) * 35 +
        (workingCapitalOk ? 25 : 0)),
      1
    ),
    0,
    100
  );

  const leverageScore = clamp(
    round(
      (debtOk
        ? 70 +
          Math.max(
            0,
            (1 - current.debtEquity / Math.max(config.maxDebtEquity, 0.01)) *
              20
          )
        : Math.max(10, 50 - current.debtEquity * 20)) +
        (interestCoverageOk ? 10 : -15),
      1
    ),
    0,
    100
  );

  const score = clamp(
    round(liquidityScore * 0.55 + leverageScore * 0.45, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (currentRatioOk && quickRatioOk) {
    reasons.push(
      "Current ratio and liquidity comfortably exceed Graham's thresholds."
    );
  }
  if (debtOk) {
    reasons.push(
      "Company maintains a strong balance sheet with conservative leverage."
    );
  }
  if (!debtOk) warnings.push("Leverage above Graham comfort zone.");
  if (!currentRatioOk) warnings.push("Current ratio below Graham threshold.");
  if (!workingCapitalOk) warnings.push("Working capital is not positive.");

  return {
    score,
    currentRatioOk,
    quickRatioOk,
    debtOk,
    interestCoverageOk,
    workingCapitalOk,
    liquidityScore,
    leverageScore,
    reasons,
    warnings,
  };
}
