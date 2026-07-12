/**
 * Sector comparison valuation — peer-relative per-share blend.
 */

import { round } from "@/lib/engine/utils";
import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  isCalculablePrice,
  marginOfSafety,
  perShareFromEquityCr,
  sanitizePerSharePrice,
  verdictFromPrice,
} from "@/lib/valuation/utils";

export function computeSectorComparisonValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price) || input.marketCapCr <= 0) {
    return { key: "sector-comparison", label: "Sector Comparison", fairValue: 0, weight: 0.1, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const eps = input.eps > 0 ? input.eps : (input.pe > 0 ? input.price / input.pe : 0);
  const bvps = input.bookValuePerShare > 0 ? input.bookValuePerShare : (input.pb > 0 ? input.price / input.pb : 0);

  const peerPeValue = eps > 0 ? sanitizePerSharePrice(Math.round(eps * input.peerPe), input.price) : 0;
  const peerPbValue = bvps > 0 ? sanitizePerSharePrice(Math.round(bvps * input.peerPb), input.price) : 0;

  const ebitdaCr =
    input.enterpriseValueCr > 0 && input.evEbitda > 0
      ? input.enterpriseValueCr / input.evEbitda
      : input.netProfitCr > 0
        ? input.netProfitCr * 1.35
        : 0;
  const netDebtCr = Math.max(0, input.enterpriseValueCr - input.marketCapCr);
  const peerEvEquityCr = ebitdaCr > 0 ? ebitdaCr * input.peerEvEbitda - netDebtCr : 0;
  const peerEvValue = peerEvEquityCr > 0
    ? perShareFromEquityCr(peerEvEquityCr, input.marketCapCr, input.price)
    : 0;

  const values = [peerPeValue, peerPbValue, peerEvValue].filter((v) => v > 0);
  const fairValue = values.length > 0
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  const peerDiscount =
    input.pe > 0 && input.peerPe > 0 ? round((1 - input.pe / input.peerPe) * 100) : 0;

  return {
    key: "sector-comparison",
    label: "Sector Comparison",
    fairValue,
    weight: 0.1,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? 70 : 0,
    explanation: fairValue > 0
      ? `Peer blend P/E ${input.peerPe}x, P/B ${input.peerPb}x, EV/EBITDA ${input.peerEvEbitda}x. ${peerDiscount > 0 ? `${peerDiscount}% discount.` : `${Math.abs(peerDiscount)}% premium.`} MOS ${marginOfSafety(fairValue, input.price)}%.`
      : "Sector comparison unavailable.",
  };
}
