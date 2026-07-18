/**
 * Buffett Economic Moat Analyzer — Sprint 11B.3U.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { BuffettConfig } from "./BuffettConstants";
import type {
  BuffettMoatAnalysis,
  BuffettMoatClassification,
  BuffettMoatInputs,
} from "./BuffettTypes";

export function analyzeEconomicMoat(
  moat: BuffettMoatInputs,
  config: BuffettConfig
): BuffettMoatAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const factors = [
    moat.brandStrength,
    moat.networkEffects,
    moat.switchingCosts,
    moat.costLeadership,
    moat.patents,
    moat.distributionAdvantage,
    moat.marketShare,
    moat.pricingPower,
    moat.recurringRevenue,
    moat.industryLeadership,
  ].map((v) => clamp(v, 0, 100));

  const score = clamp(
    round(factors.reduce((s, v) => s + v, 0) / factors.length, 1),
    0,
    100
  );

  let classification: BuffettMoatClassification = "No Moat";
  if (score >= config.wideMoatMinScore) classification = "Wide Moat";
  else if (score >= config.narrowMoatMinScore) classification = "Narrow Moat";

  if (classification === "Wide Moat" || classification === "Narrow Moat") {
    reasons.push("Business demonstrates a durable competitive advantage.");
  } else {
    warnings.push("Weak moat.");
  }

  return {
    score,
    classification,
    brandStrength: factors[0]!,
    networkEffects: factors[1]!,
    switchingCosts: factors[2]!,
    costLeadership: factors[3]!,
    patents: factors[4]!,
    distributionAdvantage: factors[5]!,
    marketShare: factors[6]!,
    pricingPower: factors[7]!,
    recurringRevenue: factors[8]!,
    industryLeadership: factors[9]!,
    reasons,
    warnings,
  };
}
