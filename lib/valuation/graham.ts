/**
 * Benjamin Graham intrinsic value model — per-share output.
 */

import { round } from "@/lib/engine/utils";
import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  isCalculablePrice,
  marginOfSafety,
  sanitizePerSharePrice,
  verdictFromPrice,
} from "@/lib/valuation/utils";

const BOND_YIELD = 7.0;

export function computeGrahamValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price)) {
    return { key: "graham", label: "Graham Intrinsic Value", fairValue: 0, weight: 0.12, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const eps = input.eps > 0 ? input.eps : (input.pe > 0 ? input.price / input.pe : 0);
  const bvps = input.bookValuePerShare > 0 ? input.bookValuePerShare : (input.pb > 0 ? input.price / input.pb : eps * 0.65);

  if (eps <= 0 || bvps <= 0) {
    return { key: "graham", label: "Graham Intrinsic Value", fairValue: 0, weight: 0.12, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient EPS or book value." };
  }

  const growth = Math.min(25, Math.max(-5, input.profitGrowth));
  const grahamClassic = Math.sqrt(22.5 * eps * bvps);
  const grahamRevised = eps * (8.5 + 2 * growth) * (4.4 / BOND_YIELD);
  const fairValue = sanitizePerSharePrice(Math.round((grahamClassic + grahamRevised) / 2), input.price);

  return {
    key: "graham",
    label: "Graham Intrinsic Value",
    fairValue,
    weight: 0.12,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? (input.profitGrowth > 0 ? 75 : 62) : 0,
    explanation: fairValue > 0
      ? `Graham on EPS ₹${round(eps)} & book ₹${round(bvps)} → ₹${fairValue.toLocaleString("en-IN")}/share. MOS ${marginOfSafety(fairValue, input.price)}%.`
      : "Graham valuation unavailable.",
  };
}
