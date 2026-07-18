/**
 * Peter Lynch Valuation Analyzer — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type {
  PeterLynchCurrentSnapshot,
  PeterLynchGrowthAnalysis,
  PeterLynchPegAnalysis,
  PeterLynchValuationAnalysis,
  PeterLynchValuationStatus,
} from "./PeterLynchTypes";

export function analyzeValuation(
  current: PeterLynchCurrentSnapshot,
  growth: PeterLynchGrowthAnalysis,
  peg: PeterLynchPegAnalysis,
  config: PeterLynchConfig
): PeterLynchValuationAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const price = current.currentPrice;
  const estimate =
    current.intrinsicValueEstimate > 0
      ? current.intrinsicValueEstimate
      : 0;

  const growthPct = Math.max(growth.epsCagr, growth.growthRate) * 100;
  const fairPe = Math.max(growthPct, config.minFairPe);
  const impliedFromGrowth =
    current.pe != null && current.pe > 0 && fairPe > 0
      ? price * (fairPe / current.pe)
      : 0;

  const intrinsicValue = round(
    estimate > 0 && impliedFromGrowth > 0
      ? estimate * config.intrinsicEstimateWeight +
          impliedFromGrowth * config.growthImpliedValueWeight
      : estimate > 0
        ? estimate
        : impliedFromGrowth > 0
          ? impliedFromGrowth
          : price,
    4
  );

  const marginOfSafety =
    intrinsicValue > 0
      ? round((intrinsicValue - price) / intrinsicValue, 4)
      : 0;

  const peOk =
    current.pe === null ||
    !Number.isFinite(current.pe) ||
    current.pe <= config.maxPeForBuy;
  const pegOk =
    peg.pegRatio > 0 && peg.pegRatio <= config.maxPegForBuy;

  let status: PeterLynchValuationStatus = "Fair Value";
  if (
    marginOfSafety >= config.minMarginOfSafetyBuy ||
    (pegOk && peg.band === "PEG < 1")
  ) {
    status = "Undervalued";
  } else if (
    marginOfSafety <= -config.fairValueBandPct ||
    peg.band === "PEG > 2"
  ) {
    status = "Overvalued";
  }

  const growthPremium = round(
    peg.pegRatio > 0
      ? Math.max(0, config.growthPremiumPegAnchor - peg.pegRatio) *
          config.growthPremiumScale
      : 0,
    1
  );

  let score = 50;
  if (status === "Undervalued") score = 90;
  else if (status === "Fair Value") score = 70;
  else score = 30;
  if (peOk) score += 5;
  if (pegOk) score += 5;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (status === "Undervalued" || pegOk) {
    reasons.push(
      "PEG ratio indicates attractive growth-adjusted valuation."
    );
  }
  if (status === "Overvalued") {
    warnings.push("Overvalued on growth-adjusted basis.");
  }

  return {
    score,
    status,
    intrinsicValue,
    currentPrice: price,
    marginOfSafety,
    peOk,
    pegOk,
    growthPremium,
    reasons,
    warnings,
  };
}
