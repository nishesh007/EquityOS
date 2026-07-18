/**
 * Graham Margin of Safety Analyzer — Sprint 11B.3V.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { GrahamConfig } from "./GrahamConstants";
import type {
  GrahamCurrentSnapshot,
  GrahamIntrinsicValueAnalysis,
  GrahamMarginSafetyAnalysis,
  GrahamValuationStatus,
} from "./GrahamTypes";

export function analyzeMarginOfSafety(
  current: GrahamCurrentSnapshot,
  intrinsic: GrahamIntrinsicValueAnalysis,
  config: GrahamConfig
): GrahamMarginSafetyAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const iv = intrinsic.intrinsicValue;
  const price = current.currentPrice;
  const marginOfSafety =
    iv > 0 ? round((iv - price) / iv, 4) : 0;
  const discountPercent =
    iv > 0 ? round(((iv - price) / iv) * 100, 2) : 0;
  const upsidePercent =
    price > 0 ? round(((iv - price) / price) * 100, 2) : 0;

  let status: GrahamValuationStatus = "Fairly Valued";
  if (marginOfSafety >= config.minMarginOfSafetyWatch) {
    status = "Undervalued";
  } else if (marginOfSafety <= -config.fairValueBandPct) {
    status = "Overvalued";
  }

  const peOk =
    current.pe === null ||
    !Number.isFinite(current.pe) ||
    current.pe <= config.maxPeForBuy;
  const pbOk =
    current.pb === null ||
    !Number.isFinite(current.pb) ||
    current.pb <= config.maxPbForBuy;

  let score = 50;
  if (marginOfSafety >= config.minMarginOfSafetyBuy) score = 95;
  else if (marginOfSafety >= config.minMarginOfSafetyWatch) score = 75;
  else if (status === "Fairly Valued") score = 55;
  else score = 20;
  if (peOk) score += 3;
  if (pbOk) score += 2;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (marginOfSafety >= config.minMarginOfSafetyWatch) {
    reasons.push(
      "Current price trades significantly below estimated intrinsic value."
    );
    reasons.push("The investment offers a meaningful margin of safety.");
  }
  if (status === "Overvalued") {
    warnings.push("Price above intrinsic value — no margin of safety.");
  }
  if (!peOk) warnings.push("PE above Graham comfort zone.");
  if (!pbOk) warnings.push("PB above Graham comfort zone.");

  return {
    score,
    marginOfSafety,
    discountPercent,
    upsidePercent,
    status,
    peOk,
    pbOk,
    reasons,
    warnings,
  };
}
