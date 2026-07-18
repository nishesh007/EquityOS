/**
 * Peter Lynch Growth Analyzer — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type {
  PeterLynchBusinessInputs,
  PeterLynchCurrentSnapshot,
  PeterLynchGrowthAnalysis,
  PeterLynchYearlyFinancials,
} from "./PeterLynchTypes";
import {
  classifyGrowthGrade,
  compoundAnnualGrowthRate,
  sortFinancialHistory,
} from "./PeterLynchUtils";

function seriesCagr(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 0;
  const start = clean[0]!;
  const end = clean[clean.length - 1]!;
  return compoundAnnualGrowthRate(start, end, clean.length - 1);
}

export function analyzeGrowth(
  history: readonly PeterLynchYearlyFinancials[],
  current: PeterLynchCurrentSnapshot,
  business: PeterLynchBusinessInputs,
  config: PeterLynchConfig
): PeterLynchGrowthAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const sorted = sortFinancialHistory(history);

  const revenueCagr =
    current.revenueCagr != null && Number.isFinite(current.revenueCagr)
      ? current.revenueCagr
      : seriesCagr(sorted.map((y) => y.revenue));
  const epsCagr =
    current.epsCagr != null && Number.isFinite(current.epsCagr)
      ? current.epsCagr
      : seriesCagr(sorted.map((y) => y.eps).filter((v) => v > 0));
  const profitCagr = seriesCagr(
    sorted.map((y) => y.netProfit).filter((v) => v > 0)
  );
  const cashFlowCagr = seriesCagr(
    sorted.map((y) => y.freeCashFlow).filter((v) => v > 0)
  );

  const margins = sorted
    .map((y) => y.operatingMargin ?? y.netMargin)
    .filter((v): v is number => v != null && Number.isFinite(v));
  let marginExpansion = 0;
  if (margins.length >= 2) {
    marginExpansion = margins[margins.length - 1]! - margins[0]!;
  } else {
    marginExpansion = current.operatingMargin - (sorted[0]?.operatingMargin ?? current.operatingMargin * 0.9);
  }

  const growthRate = (revenueCagr + epsCagr) / 2;
  const analystBoost = clamp(current.analystGrowthEstimate * 100, 0, 30);
  const growthConsistency = clamp(
    round(
      50 +
        (revenueCagr > 0 ? 15 : -10) +
        (epsCagr > 0 ? 15 : -10) +
        (cashFlowCagr > 0 ? 10 : -5) +
        (marginExpansion >= 0 ? 10 : -10) +
        analystBoost * 0.2,
      1
    ),
    0,
    100
  );

  const businessScalability = clamp(business.scalableBusiness, 0, 100);
  const marketShareGrowth = clamp(
    round((business.marketOpportunity + business.competitivePosition) / 2, 1),
    0,
    100
  );

  const grade = classifyGrowthGrade(growthRate, config);
  const score = clamp(
    round(
      (grade === "Excellent"
        ? 92
        : grade === "Good"
          ? 78
          : grade === "Average"
            ? 58
            : 28) *
        0.55 +
        growthConsistency * 0.25 +
        businessScalability * 0.2,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (grade === "Excellent" || grade === "Good") {
    reasons.push(
      "Revenue and EPS have compounded consistently over multiple years."
    );
    reasons.push("Growth quality remains above industry average.");
  }
  if (grade === "Weak") warnings.push("Weak Growth.");

  return {
    score,
    grade,
    revenueCagr: round(revenueCagr, 4),
    epsCagr: round(epsCagr, 4),
    profitCagr: round(profitCagr, 4),
    cashFlowCagr: round(cashFlowCagr, 4),
    marginExpansion: round(marginExpansion, 4),
    marketShareGrowth,
    businessScalability,
    growthConsistency,
    growthRate: round(growthRate, 4),
    reasons,
    warnings,
  };
}
