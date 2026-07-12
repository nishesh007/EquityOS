/**
 * Confidence Engine — multi-dimensional research confidence scoring.
 */

import { clamp } from "@/lib/engine/utils";
import type { ConfidenceInput, ConfidenceResult } from "@/lib/valuation/types";

export function calculateValuationConfidence(input: ConfidenceInput): ConfidenceResult {
  const { valuation, profile } = input;

  const factors = [
    {
      key: "business-confidence",
      label: "Business Confidence",
      score: clamp(input.businessScore),
      explanation: `Business quality across ${profile.industry} with sector ${profile.sector} dynamics.`,
    },
    {
      key: "financial-confidence",
      label: "Financial Confidence",
      score: clamp(input.financialScore),
      explanation: `Financial strength and earnings visibility across reported periods.`,
    },
    {
      key: "technical-confidence",
      label: "Technical Confidence",
      score: clamp(input.technicalScore),
      explanation: `Price momentum ${profile.changePercent >= 0 ? "positive" : "negative"} at ${profile.changePercent > 0 ? "+" : ""}${profile.changePercent}%.`,
    },
    {
      key: "valuation-confidence",
      label: "Valuation Confidence",
      score: clamp(valuation.blendedConfidence),
      explanation: `${valuation.overallVerdict} at blended fair value ₹${valuation.intrinsicValue.toLocaleString("en-IN")}; ${valuation.models.length} models agree with ${valuation.marginOfSafety > 0 ? `${valuation.marginOfSafety}% MOS` : "limited MOS"}.`,
    },
    {
      key: "risk-confidence",
      label: "Risk Confidence",
      score: clamp(input.riskScore),
      explanation: `Risk-adjusted confidence reflects balance-sheet strength and earnings stability.`,
    },
  ];

  const overall = Math.round(
    factors.reduce((sum, factor) => sum + factor.score, 0) / factors.length
  );

  return { overall: clamp(overall), factors };
}
