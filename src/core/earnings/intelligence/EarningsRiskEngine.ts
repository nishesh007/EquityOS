/**
 * Earnings risk engine — expected volatility and institutional interest.
 * Presentation-only risk framing; does not alter recommendation scoring.
 */

import type {
  EarningsResearchContext,
  EarningsRiskView,
  InterestLevel,
  VolatilityLevel,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

function volatilityFromContext(context: EarningsResearchContext): VolatilityLevel {
  if (context.event.highImpact || context.event.fno) return "High";
  if (context.event.marketCapBucket === "large") return "Medium";
  if (context.event.marketCapBucket === "mid") return "Medium";
  return "Low";
}

function institutionalInterest(
  context: EarningsResearchContext
): InterestLevel {
  const fii = context.fiiPercent;
  const dii = context.diiPercent;
  if (fii == null && dii == null) {
    if (context.event.highImpact || context.event.fno) return "High";
    if (context.event.inPortfolio || context.event.highConviction) return "Medium";
    return "Low";
  }
  const combined = (fii ?? 0) + (dii ?? 0);
  if (combined >= 35) return "High";
  if (combined >= 20) return "Medium";
  return "Low";
}

export function buildEarningsRiskView(
  context: EarningsResearchContext
): EarningsRiskView {
  if (!context.event.resultDate) {
    return {
      expectedVolatility: "Medium",
      institutionalInterest: "Low",
      riskSummary: INTELLIGENCE_EMPTY.awaitingEarnings,
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.awaitingEarnings,
    };
  }

  const expectedVolatility = volatilityFromContext(context);
  const interest = institutionalInterest(context);

  const parts = [
    `${expectedVolatility} expected volatility into ${context.event.quarter} ${context.event.financialYear}.`,
    `Institutional interest reads ${interest.toLowerCase()}.`,
  ];
  if (context.event.fno) {
    parts.push("F&O stock — gap risk elevated around the print.");
  }

  return {
    expectedVolatility,
    institutionalInterest: interest,
    riskSummary: parts.join(" "),
    available: true,
    emptyMessage: "",
  };
}
