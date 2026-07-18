/**
 * Quality Compounder Growth / Compounding Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderCurrentSnapshot,
  QualityCompounderGrowthAnalysis,
  QualityCompounderYearlyFinancials,
} from "./QualityCompounderTypes";
import {
  coefficientOfVariation,
  consistencyScoreFromCv,
  seriesCagr,
  sortFinancialHistory,
} from "./QualityCompounderUtils";

export function analyzeGrowthSustainability(
  history: readonly QualityCompounderYearlyFinancials[],
  current: QualityCompounderCurrentSnapshot,
  config: QualityCompounderConfig
): QualityCompounderGrowthAnalysis {
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
  const fcfCagr = seriesCagr(
    sorted.map((y) => y.freeCashFlow).filter((v) => v > 0)
  );
  const bookValueCagr = seriesCagr(
    sorted
      .map((y) => y.bookValue)
      .filter((v): v is number => v != null && v > 0)
  );

  const roeStability = consistencyScoreFromCv(
    coefficientOfVariation(
      sorted.map((y) => y.roe ?? current.roe).filter((v) => v > 0)
    ),
    config.maxEarningsCv
  );
  const roceStability = consistencyScoreFromCv(
    coefficientOfVariation(
      sorted.map((y) => y.roce ?? current.roce).filter((v) => v > 0)
    ),
    config.maxEarningsCv
  );
  const marginStability = consistencyScoreFromCv(
    coefficientOfVariation(
      sorted
        .map((y) => y.operatingMargin ?? current.operatingMargin)
        .filter((v) => Number.isFinite(v))
    ),
    config.maxRevenueCv
  );

  const capitalEfficiency = clamp(
    round(((current.roe + current.roce + current.roic) / 3) * 250, 1),
    0,
    100
  );
  const reinvestmentAbility = clamp(
    round(
      (fcfCagr > 0 ? 40 : 10) +
        (revenueCagr >= config.minRevenueCagrBuy ? 30 : 10) +
        (current.analystGrowthEstimate > 0 ? 20 : 5) +
        clamp(current.marketShare, 0, 100) * 0.1,
      1
    ),
    0,
    100
  );

  const growthSustainability = clamp(
    round(
      (revenueCagr >= config.minRevenueCagrBuy ? 20 : 5) +
        (epsCagr >= config.minEpsCagrBuy ? 20 : 5) +
        (fcfCagr >= config.minFcfCagrBuy ? 15 : 5) +
        roeStability * 0.15 +
        roceStability * 0.1 +
        marginStability * 0.1 +
        capitalEfficiency * 0.1,
      1
    ),
    0,
    100
  );

  const score = clamp(
    round(
      growthSustainability * 0.55 +
        capitalEfficiency * 0.2 +
        reinvestmentAbility * 0.25,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (score >= config.minGrowthSustainabilityBuy) {
    reasons.push(
      "Revenue, earnings and free cash flow have compounded consistently for more than a decade."
    );
  }
  if (growthSustainability < 50) warnings.push("Weak compounding trajectory.");

  return {
    score,
    revenueCagr: round(revenueCagr, 4),
    epsCagr: round(epsCagr, 4),
    fcfCagr: round(fcfCagr, 4),
    bookValueCagr: round(bookValueCagr, 4),
    roeStability,
    roceStability,
    marginStability,
    capitalEfficiency,
    reinvestmentAbility,
    growthSustainability,
    reasons,
    warnings,
  };
}
