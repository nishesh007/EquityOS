/**
 * Quality Compounder Valuation Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderCurrentSnapshot,
  QualityCompounderGrowthAnalysis,
  QualityCompounderValuationAnalysis,
  QualityCompounderValuationStatus,
} from "./QualityCompounderTypes";

export function analyzeValuation(
  current: QualityCompounderCurrentSnapshot,
  growth: QualityCompounderGrowthAnalysis,
  config: QualityCompounderConfig
): QualityCompounderValuationAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const price = current.currentPrice;
  const estimate =
    current.intrinsicValueEstimate > 0
      ? current.intrinsicValueEstimate
      : 0;

  const growthPct = Math.max(growth.epsCagr, growth.revenueCagr) * 100;
  const fairPe = Math.max(growthPct, config.minFairPe);
  const implied =
    current.pe != null && current.pe > 0 && fairPe > 0
      ? price * (fairPe / current.pe)
      : 0;

  const intrinsicValue = round(
    estimate > 0 && implied > 0
      ? estimate * config.intrinsicEstimateWeight +
          implied * config.growthImpliedWeight
      : estimate > 0
        ? estimate
        : implied > 0
          ? implied
          : price,
    4
  );

  const marginOfSafety =
    intrinsicValue > 0
      ? round((intrinsicValue - price) / intrinsicValue, 4)
      : 0;

  let status: QualityCompounderValuationStatus = "Fair Value";
  if (marginOfSafety >= config.minMarginOfSafetyBuy) {
    status = "Undervalued";
  } else if (
    marginOfSafety < -config.premiumQualityMaxOverpay &&
    marginOfSafety >= -config.fairValueBandPct - config.premiumQualityMaxOverpay
  ) {
    status = "Premium Quality";
  } else if (marginOfSafety <= -config.fairValueBandPct - config.premiumQualityMaxOverpay) {
    status = "Overvalued";
  } else if (marginOfSafety < 0 && marginOfSafety > -config.fairValueBandPct) {
    status = "Premium Quality";
  }

  let score = 50;
  if (status === "Undervalued") score = 90;
  else if (status === "Fair Value") score = 75;
  else if (status === "Premium Quality") score = 65;
  else score = 30;

  const peOk =
    current.pe === null ||
    !Number.isFinite(current.pe) ||
    current.pe <= config.maxPeForBuy;
  const fcfOk = current.fcfYield >= config.minFcfYieldBuy;
  if (peOk) score += 5;
  if (fcfOk) score += 5;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (status === "Undervalued" || status === "Fair Value") {
    reasons.push(
      "Valuation is compatible with long-term compounding ownership."
    );
  }
  if (status === "Overvalued") {
    warnings.push("Overvalued relative to intrinsic value.");
  }

  return {
    score,
    status,
    intrinsicValue,
    currentPrice: price,
    marginOfSafety,
    reasons,
    warnings,
  };
}
