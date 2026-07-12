/**
 * Relative P/B valuation — per-share output.
 */

import { round } from "@/lib/engine/utils";
import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  fairPbFromRoe,
  isCalculablePrice,
  marginOfSafety,
  sanitizePerSharePrice,
  verdictFromPrice,
  verdictFromRatio,
} from "@/lib/valuation/utils";

export function computeRelativePbValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price)) {
    return { key: "relative-pb", label: "Relative P/B", fairValue: 0, weight: 0.1, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const bvps = input.bookValuePerShare > 0 ? input.bookValuePerShare : (input.pb > 0 ? input.price / input.pb : 0);
  if (bvps <= 0) {
    return { key: "relative-pb", label: "Relative P/B", fairValue: 0, weight: 0.1, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient book value." };
  }

  const fairPb = fairPbFromRoe(input.roe);
  const fairValue = sanitizePerSharePrice(Math.round(bvps * fairPb), input.price);
  const pbVerdict = verdictFromRatio(input.pb, fairPb);

  return {
    key: "relative-pb",
    label: "Relative P/B",
    fairValue,
    weight: 0.1,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? 70 : 0,
    explanation: `Book ₹${round(bvps)} × fair P/B ${fairPb}x (${pbVerdict}) vs ${input.pb}x. MOS ${marginOfSafety(fairValue, input.price)}%.`,
  };
}
