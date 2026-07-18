/**
 * Peter Lynch Financial Strength Analyzer — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type {
  PeterLynchCurrentSnapshot,
  PeterLynchFinancialAnalysis,
  PeterLynchYearlyFinancials,
} from "./PeterLynchTypes";
import { sortFinancialHistory } from "./PeterLynchUtils";

export function analyzeFinancialStrength(
  history: readonly PeterLynchYearlyFinancials[],
  current: PeterLynchCurrentSnapshot,
  config: PeterLynchConfig
): PeterLynchFinancialAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const sorted = sortFinancialHistory(history);

  const positiveFcf = current.freeCashFlow > 0;
  const positiveOcf = current.operatingCashFlow > 0;
  const roeOk = current.roe >= config.minRoe;
  const roceOk = current.roce >= config.minRoce;
  const debtOk = current.debtEquity <= config.maxDebtEquity;
  const liquidityOk = current.currentRatio >= config.minCurrentRatio;
  const interestOk = current.interestCoverage >= config.minInterestCoverage;

  const margins = sorted
    .map((y) => y.operatingMargin ?? y.netMargin)
    .filter((v): v is number => v != null && Number.isFinite(v));
  let growingMargins = true;
  if (margins.length >= 3) {
    const early = margins.slice(0, Math.floor(margins.length / 2));
    const late = margins.slice(Math.floor(margins.length / 2));
    const earlyAvg =
      early.reduce((s, v) => s + v, 0) / Math.max(early.length, 1);
    const lateAvg = late.reduce((s, v) => s + v, 0) / Math.max(late.length, 1);
    growingMargins = lateAvg >= earlyAvg - 0.01;
  } else {
    growingMargins = current.operatingMargin >= config.minRoe * 0.5;
  }

  const fcfPositiveYears = sorted.filter((y) => y.freeCashFlow > 0).length;
  const cashFlowQuality = clamp(
    round((fcfPositiveYears / Math.max(sorted.length, 1)) * 100, 1),
    0,
    100
  );

  const epsPositiveYears = sorted.filter((y) => y.eps > 0).length;
  const earningsQuality = clamp(
    round((epsPositiveYears / Math.max(sorted.length, 1)) * 100, 1),
    0,
    100
  );

  const healthyBalanceSheet =
    debtOk && liquidityOk && interestOk && positiveOcf;

  let score = 40;
  if (positiveFcf) score += 12;
  if (roeOk) score += 12;
  if (roceOk) score += 10;
  if (debtOk) score += 10;
  if (growingMargins) score += 8;
  if (healthyBalanceSheet) score += 8;
  score = clamp(
    round(score * 0.7 + cashFlowQuality * 0.15 + earningsQuality * 0.15, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (healthyBalanceSheet) {
    reasons.push("Balance sheet supports future expansion.");
  }
  if (!positiveFcf) warnings.push("Negative Cash Flow.");
  if (!debtOk) warnings.push("High Debt.");
  if (!growingMargins) warnings.push("Declining Margins.");

  return {
    score,
    positiveFcf,
    positiveOcf,
    roeOk,
    roceOk,
    debtOk,
    growingMargins,
    healthyBalanceSheet,
    earningsQuality,
    cashFlowQuality,
    reasons,
    warnings,
  };
}
