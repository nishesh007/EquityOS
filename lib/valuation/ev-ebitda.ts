/**
 * EV/EBITDA valuation — per-share output.
 */

import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  isCalculablePrice,
  marginOfSafety,
  perShareFromEquityCr,
  verdictFromPrice,
  verdictFromRatio,
} from "@/lib/valuation/utils";

export function computeEvEbitdaValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price) || input.marketCapCr <= 0) {
    return { key: "ev-ebitda", label: "EV/EBITDA", fairValue: 0, weight: 0.13, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const ebitdaCr =
    input.enterpriseValueCr > 0 && input.evEbitda > 0
      ? input.enterpriseValueCr / input.evEbitda
      : input.netProfitCr > 0
        ? input.netProfitCr * 1.35
        : 0;

  if (ebitdaCr <= 0) {
    return { key: "ev-ebitda", label: "EV/EBITDA", fairValue: 0, weight: 0.13, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient EBITDA data." };
  }

  const fairEvMultiple = input.sectorEvEbitda;
  const fairEnterpriseValueCr = ebitdaCr * fairEvMultiple;
  const netDebtCr = Math.max(0, input.enterpriseValueCr - input.marketCapCr);
  const fairEquityCr = fairEnterpriseValueCr - netDebtCr;

  const fairValue = perShareFromEquityCr(fairEquityCr, input.marketCapCr, input.price);
  const evVerdict = verdictFromRatio(input.evEbitda, fairEvMultiple);

  return {
    key: "ev-ebitda",
    label: "EV/EBITDA",
    fairValue,
    weight: 0.13,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? 72 : 0,
    explanation: fairValue > 0
      ? `EBITDA ₹${Math.round(ebitdaCr).toLocaleString("en-IN")} Cr × ${fairEvMultiple}x (${evVerdict}) → ₹${fairValue.toLocaleString("en-IN")}/share. MOS ${marginOfSafety(fairValue, input.price)}%.`
      : "EV/EBITDA unavailable.",
  };
}
