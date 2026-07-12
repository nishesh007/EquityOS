/**
 * Discounted Cash Flow (DCF) valuation model — per-share output.
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

const PROJECTION_YEARS = 5;

export function computeDcfValuation(input: ValuationInputs): ValuationModelResult {
  if (!isCalculablePrice(input.price) || input.marketCapCr <= 0) {
    return unavailableModel("dcf", "Discounted Cash Flow", 0.25);
  }

  const wacc = estimateWacc(input.beta, input.debtEquity) / 100;
  const growthRate = Math.min(0.2, Math.max(0.03, input.profitGrowth / 100));
  const terminalGrowth = Math.min(0.04, Math.max(0.02, growthRate * 0.5));

  let fcf = input.fcfCr > 0 ? input.fcfCr : input.netProfitCr * 0.7;
  if (fcf <= 0) return unavailableModel("dcf", "Discounted Cash Flow", 0.25);

  let pvFcf = 0;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    fcf *= 1 + growthRate;
    pvFcf += fcf / (1 + wacc) ** year;
  }

  const terminalFcf = fcf * (1 + terminalGrowth);
  const spread = Math.max(wacc - terminalGrowth, 0.03);
  const terminalValue = terminalFcf / spread;
  const pvTerminal = terminalValue / (1 + wacc) ** PROJECTION_YEARS;

  const enterpriseValueCr = pvFcf + pvTerminal;
  const netDebtCr = Math.max(0, input.enterpriseValueCr - input.marketCapCr);
  const equityValueCr = Math.max(enterpriseValueCr - netDebtCr, enterpriseValueCr * 0.85);

  const fairValue = perShareFromEquityCr(equityValueCr, input.marketCapCr, input.price);
  const confidence = clampConfidence(input.fcfCr > 0, input.profitGrowth);

  return {
    key: "dcf",
    label: "Discounted Cash Flow",
    fairValue,
    weight: 0.25,
    verdict: verdictFromPrice(input.price, fairValue),
    confidence,
    explanation: fairValue > 0
      ? `5-year DCF at ${round(wacc * 100)}% WACC with ${round(growthRate * 100)}% FCF growth → ₹${fairValue.toLocaleString("en-IN")}/share. MOS ${marginOfSafety(fairValue, input.price)}%.`
      : "Insufficient cash flow data for DCF valuation.",
  };
}

function unavailableModel(key: string, label: string, weight: number): ValuationModelResult {
  return { key, label, fairValue: 0, weight, verdict: "Fairly Valued", confidence: 0, explanation: "Insufficient data." };
}

function clampConfidence(hasFcf: boolean, profitGrowth: number): number {
  let base = hasFcf ? 72 : 58;
  if (profitGrowth > 15) base += 8;
  if (profitGrowth < 0) base -= 12;
  return Math.min(90, Math.max(40, base));
}
