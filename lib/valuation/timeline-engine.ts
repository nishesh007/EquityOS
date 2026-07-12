/**
 * Decision Timeline Engine — investment roadmap across horizons.
 */

import type { RecommendationLevel } from "@/types";
import type { DecisionTimelineItem, PriceTargetResult } from "@/lib/valuation/types";

export function buildDecisionTimeline(
  recommendation: RecommendationLevel,
  confidence: number,
  targets: PriceTargetResult,
  intrinsicValue: number,
  marginOfSafety: number
): DecisionTimelineItem[] {
  const actionTone =
    recommendation === "Strong Buy" || recommendation === "Buy"
      ? "Accumulate"
      : recommendation === "Accumulate"
        ? "Scale in"
        : recommendation === "Hold"
          ? "Monitor"
          : "Reduce exposure";

  return [
    {
      id: "immediate",
      phase: "Immediate",
      title: `${actionTone} on dips`,
      description: `Ideal entry zone ${targets.idealBuyZone} with ${confidence}% research confidence. Position sizing at ${targets.capitalAllocationPercent}% capital allocation.`,
      horizon: "0–2 weeks",
    },
    {
      id: "1-month",
      phase: "1 Month",
      title: `Target 1 — ₹${targets.target1.toLocaleString("en-IN")}`,
      description: `First profit-booking zone. Trailing stop at ₹${targets.trailingStop.toLocaleString("en-IN")}. Risk/reward ${targets.riskReward}x.`,
      horizon: "4 weeks",
    },
    {
      id: "3-months",
      phase: "3 Months",
      title: `Fair value — ₹${targets.target2.toLocaleString("en-IN")}`,
      description: `Core upside target aligned with intrinsic value ₹${intrinsicValue.toLocaleString("en-IN")} and ${marginOfSafety > 0 ? `${marginOfSafety}% margin of safety` : "sector re-rating potential"}.`,
      horizon: "3 months",
    },
    {
      id: "6-months",
      phase: "6 Months",
      title: `Stretch target — ₹${targets.target3.toLocaleString("en-IN")}`,
      description: `Extended target on sustained execution. Stop loss at ₹${targets.stopLoss.toLocaleString("en-IN")}.`,
      horizon: "6 months",
    },
    {
      id: "12-months",
      phase: "12 Months",
      title: "Reassess thesis",
      description: `Full-cycle review. Invalidation below ₹${targets.invalidationLevel.toLocaleString("en-IN")}. Long-term buy zone ${targets.longTermBuy}.`,
      horizon: "12 months",
    },
  ];
}
