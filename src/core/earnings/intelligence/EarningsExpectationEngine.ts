/**
 * Earnings expectation engine — expected revenue / EPS / margin outcomes.
 * Derives from historical quarterly series (reuses surprise heuristics; no new research engine).
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import type {
  AIExpectationView,
  EarningsResearchContext,
  ExpectationOutcome,
  MarginTrendExpectation,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

function toOutcome(
  surprise: "positive" | "negative" | "neutral" | undefined
): ExpectationOutcome {
  if (surprise === "positive") return "Expected Beat";
  if (surprise === "negative") return "Miss";
  return "Inline";
}

function marginTrendFromSeries(
  margins: number[]
): MarginTrendExpectation | null {
  if (margins.length < 2) return null;
  const latest = margins[0]!;
  const prior = margins[1]!;
  const delta = latest - prior;
  if (delta > 0.3) return "Expand";
  if (delta < -0.3) return "Compress";
  return "Stable";
}

export function getAIExpectation(
  context: EarningsResearchContext
): AIExpectationView {
  if (!context.quarters || context.quarters.length < 2) {
    return {
      revenue: "Inline",
      eps: "Inline",
      marginTrend: "Stable",
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.insufficientHistory,
    };
  }

  const enriched = enrichQuarterlyResults(context.quarters);
  const latest = enriched[0];
  if (!latest) {
    return {
      revenue: "Inline",
      eps: "Inline",
      marginTrend: "Stable",
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.insufficientHistory,
    };
  }

  const revenue = toOutcome(latest.surprise);
  // EPS expectation leans on profit surprise + EPS YoY
  let eps: ExpectationOutcome = "Inline";
  if ((latest.epsYoY ?? 0) > 8 && latest.surprise !== "negative") {
    eps = "Expected Beat";
  } else if ((latest.epsYoY ?? 0) < -2 || latest.surprise === "negative") {
    eps = "Miss";
  }

  const margins = context.quarters.map((q) => q.margin);
  const marginTrend = marginTrendFromSeries(margins) ?? "Stable";

  // Growth tilt from annual financials when available
  if (
    context.revenueGrowth != null &&
    context.revenueGrowth > 12 &&
    revenue === "Inline"
  ) {
    return {
      revenue: "Expected Beat",
      eps,
      marginTrend,
      available: true,
      emptyMessage: "",
    };
  }

  return {
    revenue,
    eps,
    marginTrend,
    available: true,
    emptyMessage: "",
  };
}
