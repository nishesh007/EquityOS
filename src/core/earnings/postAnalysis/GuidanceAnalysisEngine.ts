/**
 * Guidance analysis — Upgrade / Downgrade / No Change heuristics from growth & margins.
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import type { EarningsResearchContext } from "@/src/core/earnings/intelligence";
import type { EstimateComparisonView, GuidanceSummaryView } from "./PostEarningsModels";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

export function getGuidanceSummary(
  context: EarningsResearchContext,
  comparison: EstimateComparisonView
): GuidanceSummaryView {
  if (!context.quarters || context.quarters.length < 2 || !comparison.available) {
    return {
      previous: POST_EARNINGS_EMPTY.guidanceNotAvailable,
      current: POST_EARNINGS_EMPTY.guidanceNotAvailable,
      change: "No Change",
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.guidanceNotAvailable,
      commentary: POST_EARNINGS_EMPTY.commentaryPending,
    };
  }

  const enriched = enrichQuarterlyResults(context.quarters);
  const latest = enriched[0]!;
  const prior = enriched[1];

  const revenueYoY = latest.revenueYoY ?? 0;
  const profitYoY = latest.profitYoY ?? 0;
  const marginDelta = prior ? latest.margin - prior.margin : 0;

  let change: GuidanceSummaryView["change"] = "No Change";
  if (
    profitYoY > revenueYoY + 3 &&
    marginDelta > 0.2 &&
    (comparison.overallOutcome === "Beat" ||
      comparison.overallOutcome === "Strong Beat")
  ) {
    change = "Upgrade";
  } else if (
    profitYoY < revenueYoY - 4 ||
    marginDelta < -0.4 ||
    comparison.overallOutcome === "Miss" ||
    comparison.overallOutcome === "Major Miss"
  ) {
    change = "Downgrade";
  }

  const previous = prior
    ? `${prior.quarter} trajectory · margin ${prior.margin}%`
    : POST_EARNINGS_EMPTY.guidanceNotAvailable;
  const current = `${latest.quarter} · revenue YoY ${revenueYoY >= 0 ? "+" : ""}${revenueYoY}% · profit YoY ${profitYoY >= 0 ? "+" : ""}${profitYoY}%`;

  const commentary =
    change === "Upgrade"
      ? "Tone implies constructive outlook with room for estimate upgrades."
      : change === "Downgrade"
        ? "Tone skewed cautious — watch for softer forward commentary."
        : POST_EARNINGS_EMPTY.commentaryPending;

  return {
    previous,
    current,
    change,
    available: true,
    emptyMessage: "",
    commentary,
  };
}
