/**
 * Buffett Valuation Analyzer — Sprint 11B.3U.
 * Intrinsic value is price-unit consistent (per-share).
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettConfig } from "./BuffettConstants";
import type {
  BuffettCurrentSnapshot,
  BuffettValuationAnalysis,
  BuffettValuationStatus,
  BuffettYearlyFinancials,
} from "./BuffettTypes";
import { average, sortFinancialHistory } from "./BuffettUtils";

/**
 * Price-unit DCF cross-check from FCF yield (not absolute FCF × multiple).
 * Returns 0 when insufficient data.
 */
function yieldBasedIntrinsic(
  current: BuffettCurrentSnapshot,
  requiredFcfYield: number
): number {
  if (!(current.currentPrice > 0)) return 0;
  if (!(current.fcfYield > 0)) return 0;
  if (!(requiredFcfYield > 0)) return 0;
  return current.currentPrice * (current.fcfYield / requiredFcfYield);
}

/**
 * Growth-adjusted sanity IV from trailing FCF trend vs price.
 * Stays in share-price units.
 */
function historySupportiveIntrinsic(
  history: readonly BuffettYearlyFinancials[],
  current: BuffettCurrentSnapshot
): number {
  const sorted = sortFinancialHistory(history);
  const fcf = sorted
    .map((y) => y.freeCashFlow)
    .filter((v) => Number.isFinite(v));
  if (fcf.length < 3 || !(current.currentPrice > 0)) return 0;
  const recent = average(fcf.slice(-3));
  const older = average(fcf.slice(0, 3));
  if (!(older > 0) || !(recent > 0)) return 0;
  const growth = (recent - older) / older;
  return current.currentPrice * (1 + clamp(growth, -0.3, 0.5));
}

function resolveIntrinsicValue(
  current: BuffettCurrentSnapshot,
  history: readonly BuffettYearlyFinancials[],
  config: BuffettConfig
): number {
  const estimate =
    current.intrinsicValueEstimate > 0 &&
    Number.isFinite(current.intrinsicValueEstimate)
      ? current.intrinsicValueEstimate
      : 0;
  const yieldIv = yieldBasedIntrinsic(current, config.requiredFcfYield);
  const historyIv = historySupportiveIntrinsic(history, current);
  const estimateWeight = clamp(config.intrinsicEstimateWeight, 0, 1);
  const crossWeight = 1 - estimateWeight;

  if (estimate > 0) {
    const crossChecks = [yieldIv, historyIv].filter((v) => v > 0);
    if (crossChecks.length === 0) return estimate;
    const crossAvg =
      crossChecks.reduce((s, v) => s + v, 0) / crossChecks.length;
    return estimate * estimateWeight + crossAvg * crossWeight;
  }

  if (yieldIv > 0 && historyIv > 0) return (yieldIv + historyIv) / 2;
  if (yieldIv > 0) return yieldIv;
  if (historyIv > 0) return historyIv;
  return current.currentPrice;
}

export function analyzeValuation(
  current: BuffettCurrentSnapshot,
  history: readonly BuffettYearlyFinancials[],
  config: BuffettConfig
): BuffettValuationAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const intrinsicValue = round(
    resolveIntrinsicValue(current, history, config),
    4
  );
  const currentPrice = current.currentPrice;
  const marginOfSafety =
    intrinsicValue > 0
      ? round((intrinsicValue - currentPrice) / intrinsicValue, 4)
      : 0;

  let status: BuffettValuationStatus = "Fairly Valued";
  if (marginOfSafety >= config.minMarginOfSafetyBuy) {
    status = "Undervalued";
  } else if (marginOfSafety <= -config.fairValueBandPct) {
    status = "Overvalued";
  }

  const peOk =
    current.pe === null ||
    !Number.isFinite(current.pe) ||
    current.pe <= config.maxPeForBuy;
  const fcfYieldOk = current.fcfYield >= config.minFcfYieldBuy;
  const dcfSupportive = marginOfSafety >= -config.fairValueBandPct;

  let score = 50;
  if (status === "Undervalued") score = 90;
  else if (status === "Fairly Valued") score = 70;
  else score = 30;
  if (peOk) score += 5;
  if (fcfYieldOk) score += 5;
  score = clamp(score, 0, 100);

  if (status === "Undervalued") {
    reasons.push(
      "Current valuation provides an adequate margin of safety."
    );
  }
  if (status === "Overvalued") {
    warnings.push("Overvalued relative to intrinsic value.");
  }

  return {
    score,
    status,
    intrinsicValue,
    currentPrice,
    marginOfSafety,
    dcfSupportive,
    peOk,
    fcfYieldOk,
    reasons,
    warnings,
  };
}
