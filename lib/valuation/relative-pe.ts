/**
 * Relative P/E valuation — per-share output.
 */

import { round } from "@/lib/engine/utils";
import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  fairPeFromGrowth,
  isCalculablePrice,
  marginOfSafety,
  sanitizePerSharePrice,
  verdictFromPrice,
  verdictFromRatio,
} from "@/lib/valuation/utils";

export function computeRelativePeValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price)) {
    return { key: "relative-pe", label: "Relative P/E", fairValue: 0, weight: 0.15, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const eps = input.eps > 0 ? input.eps : (input.pe > 0 ? input.price / input.pe : 0);
  if (eps <= 0) {
    return { key: "relative-pe", label: "Relative P/E", fairValue: 0, weight: 0.15, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient EPS data." };
  }

  const fairPe = fairPeFromGrowth(input.profitGrowth, input.sectorPe);
  const fairValue = sanitizePerSharePrice(Math.round(eps * fairPe), input.price);
  const peVerdict = verdictFromRatio(input.pe, fairPe);

  return {
    key: "relative-pe",
    label: "Relative P/E",
    fairValue,
    weight: 0.15,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? 74 : 0,
    explanation: `EPS ₹${round(eps)} × fair P/E ${fairPe}x (${peVerdict}) vs ${input.pe}x. MOS ${marginOfSafety(fairValue, input.price)}%.`,
  };
}
