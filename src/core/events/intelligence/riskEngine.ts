/**
 * Risk Engine (Sprint 10D.4).
 */

import { getEventCategory } from "@/constants/eventTypes";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  RiskAnalysis,
  RiskRating,
  ScoreFactor,
} from "@/types/eventIntelligence";
import { clampScore } from "@/src/core/events/intelligence/constants";

function toRating(score: number): RiskRating {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function computeRiskAnalysis(
  event: EventIntelligenceEvent,
  impactScore: number,
  volatilityLevel: "low" | "medium" | "high"
): RiskAnalysis {
  const category = getEventCategory(event.eventType);
  const factors: ScoreFactor[] = [
    {
      id: "impact_linkage",
      label: "Impact Linkage",
      points: Math.round(impactScore * 0.35),
      maxPoints: 35,
      rationale: `Impact score ${impactScore} feeds risk linearly.`,
    },
    {
      id: "volatility",
      label: "Expected Volatility",
      points: volatilityLevel === "high" ? 28 : volatilityLevel === "medium" ? 16 : 8,
      maxPoints: 28,
      rationale: `Expected volatility classified as ${volatilityLevel}.`,
    },
    {
      id: "category_tail",
      label: "Category Tail Risk",
      points:
        category === "central_bank" || category === "critical"
          ? 22
          : category === "economic"
            ? 16
            : category === "results"
              ? 12
              : 8,
      maxPoints: 22,
      rationale: `${category.replace(/_/g, " ")} events carry distinct tail profiles.`,
    },
    {
      id: "uncertainty",
      label: "Outcome Uncertainty",
      points:
        event.marketDirection === "unknown" || event.marketDirection === "mixed"
          ? 15
          : 6,
      maxPoints: 15,
      rationale: `Pre-event market direction = ${event.marketDirection}.`,
    },
  ];

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const score = clampScore(raw);
  const rating = toRating(score);

  return {
    rating,
    score,
    rationale: `Risk rated ${rating.replace(/_/g, " ")} because impact (${impactScore}), ${volatilityLevel} volatility and ${category.replace(/_/g, " ")} tail characteristics combine to ${score}/100.`,
    factors,
  };
}

export const riskEngine = {
  compute: computeRiskAnalysis,
};
