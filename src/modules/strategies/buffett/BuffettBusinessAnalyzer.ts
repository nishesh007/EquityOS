/**
 * Buffett Business Quality Analyzer — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettConfig } from "./BuffettConstants";
import type {
  BuffettBusinessAnalysis,
  BuffettCurrentSnapshot,
  BuffettYearlyFinancials,
} from "./BuffettTypes";
import {
  average,
  coefficientOfVariation,
  consistencyScoreFromCv,
  growthSeries,
  sortFinancialHistory,
} from "./BuffettUtils";

export function analyzeBusinessQuality(
  history: readonly BuffettYearlyFinancials[],
  current: BuffettCurrentSnapshot,
  config: BuffettConfig
): BuffettBusinessAnalysis {
  const sorted = sortFinancialHistory(history);
  const reasons: string[] = [];
  const warnings: string[] = [];

  const revenues = sorted.map((y) => y.revenue);
  const eps = sorted.map((y) => y.eps);
  const fcf = sorted.map((y) => y.freeCashFlow);
  const profits = sorted.map((y) => y.netProfit);
  const opMargins = sorted.map(
    (y) => y.operatingMargin ?? current.operatingMargin
  );

  const revenueConsistency = consistencyScoreFromCv(
    coefficientOfVariation(growthSeries(revenues)),
    config.maxRevenueCv
  );
  const epsConsistency = consistencyScoreFromCv(
    coefficientOfVariation(growthSeries(eps)),
    config.maxEarningsCv
  );
  const cashFlowConsistency = consistencyScoreFromCv(
    coefficientOfVariation(fcf.filter((v) => v !== 0)),
    config.maxEarningsCv
  );
  const profitConsistency = consistencyScoreFromCv(
    coefficientOfVariation(growthSeries(profits)),
    config.maxEarningsCv
  );
  const marginStability = consistencyScoreFromCv(
    coefficientOfVariation(opMargins),
    0.35
  );

  const positiveFcfYears = fcf.filter((v) => v > 0).length;
  const capitalAllocation = clamp(
    round((positiveFcfYears / Math.max(fcf.length, 1)) * 100, 1),
    0,
    100
  );

  const predictability = clamp(
    round(
      (revenueConsistency +
        epsConsistency +
        cashFlowConsistency +
        profitConsistency +
        marginStability) /
        5,
      1
    ),
    0,
    100
  );

  // Simple durable businesses score higher when margins are stable and FCF positive.
  const businessSimplicity = clamp(
    round(
      40 +
        marginStability * 0.3 +
        (current.operatingMargin >= config.minOperatingMargin ? 15 : 0) +
        (average(fcf) > 0 ? 15 : 0),
      1
    ),
    0,
    100
  );

  const score = clamp(
    round(
      revenueConsistency * 0.15 +
        epsConsistency * 0.2 +
        cashFlowConsistency * 0.15 +
        profitConsistency * 0.15 +
        marginStability * 0.1 +
        capitalAllocation * 0.1 +
        predictability * 0.1 +
        businessSimplicity * 0.05,
      1
    ),
    0,
    100
  );

  if (predictability >= 70) {
    reasons.push("Free cash flow generation is highly predictable.");
  }
  if (epsConsistency < 50) {
    warnings.push("Unpredictable earnings.");
  }
  if (marginStability < 50) {
    warnings.push("Weak margins.");
  }

  return {
    score,
    revenueConsistency,
    epsConsistency,
    cashFlowConsistency,
    profitConsistency,
    marginStability,
    capitalAllocation,
    predictability,
    businessSimplicity,
    reasons,
    warnings,
  };
}
