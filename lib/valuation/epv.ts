/**
 * Earnings Power Value (EPV) — per-share output.
 */

import { round } from "@/lib/engine/utils";
import type { ValuationModelResult, ValuationInputs } from "@/lib/valuation/types";
import {
  estimateWacc,
  isCalculablePrice,
  marginOfSafety,
  perShareFromEquityCr,
  verdictFromPrice,
} from "@/lib/valuation/utils";

export function computeEpvValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price) || input.marketCapCr <= 0) {
    return { key: "epv", label: "Earnings Power Value", fairValue: 0, weight: 0.15, verdict: "Fairly Valued", confidence: 0, explanation: "No valid market price." };
  }

  const normalizedEarningsCr =
    input.netProfitCr > 0
      ? input.netProfitCr
      : input.revenueCr > 0
        ? input.revenueCr * (input.operatingMargin / 100) * 0.75
        : 0;

  if (normalizedEarningsCr <= 0) {
    return { key: "epv", label: "Earnings Power Value", fairValue: 0, weight: 0.15, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient earnings data." };
  }

  const costOfCapital = estimateWacc(input.beta, input.debtEquity) / 100;
  const enterpriseValueCr = costOfCapital > 0 ? normalizedEarningsCr / costOfCapital : 0;
  const netDebtCr = Math.max(0, input.enterpriseValueCr - input.marketCapCr);
  const equityValueCr = Math.max(enterpriseValueCr - netDebtCr, enterpriseValueCr * 0.9);

  const fairValue = perShareFromEquityCr(equityValueCr, input.marketCapCr, input.price);

  return {
    key: "epv",
    label: "Earnings Power Value",
    fairValue,
    weight: 0.15,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence: fairValue > 0 ? 68 : 0,
    explanation: fairValue > 0
      ? `Earnings ₹${Math.round(normalizedEarningsCr).toLocaleString("en-IN")} Cr at ${round(costOfCapital * 100)}% CoC → ₹${fairValue.toLocaleString("en-IN")}/share. MOS ${marginOfSafety(fairValue, input.price)}%.`
      : "EPV unavailable.",
  };
}
