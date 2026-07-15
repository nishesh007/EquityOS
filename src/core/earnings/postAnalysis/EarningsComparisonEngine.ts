/**
 * Earnings comparison engine — QoQ / YoY actual deltas from enriched quarters.
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { parseInrCrores } from "@/lib/fundamentals/normalize";
import { round } from "@/lib/engine/utils";
import type { EarningsResearchContext, EarningsQuarterPoint } from "@/src/core/earnings/intelligence";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

export interface ActualsComparisonView {
  revenueQoQ: string;
  revenueYoY: string;
  epsQoQ: string;
  epsYoY: string;
  marginDelta: string;
  available: boolean;
  emptyMessage: string;
  trendPoints: EarningsQuarterPoint[];
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return POST_EARNINGS_EMPTY.resultsNotPublished;
  }
  const rounded = round(value, 1);
  if (rounded === 0) return "Flat";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function buildActualsComparison(
  context: EarningsResearchContext
): ActualsComparisonView {
  if (!context.quarters || context.quarters.length < 2) {
    return {
      revenueQoQ: POST_EARNINGS_EMPTY.resultsNotPublished,
      revenueYoY: POST_EARNINGS_EMPTY.resultsNotPublished,
      epsQoQ: POST_EARNINGS_EMPTY.resultsNotPublished,
      epsYoY: POST_EARNINGS_EMPTY.resultsNotPublished,
      marginDelta: POST_EARNINGS_EMPTY.resultsNotPublished,
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.resultsNotPublished,
      trendPoints: [],
    };
  }

  const enriched = enrichQuarterlyResults(context.quarters);
  const latest = enriched[0]!;
  const prior = enriched[1];
  const marginDelta =
    prior != null ? round(latest.margin - prior.margin, 1) : null;

  const trendPoints: EarningsQuarterPoint[] = enriched.map((q) => ({
    label: q.quarter,
    revenue: parseInrCrores(q.revenue),
    eps: q.eps,
    margin: q.margin,
    surprise:
      q.surprise === "positive"
        ? "Beat"
        : q.surprise === "negative"
          ? "Miss"
          : q.surprise === "neutral"
            ? "Inline"
            : "—",
  }));

  return {
    revenueQoQ: fmtPct(latest.revenueQoQ),
    revenueYoY: fmtPct(latest.revenueYoY),
    epsQoQ: fmtPct(latest.epsQoQ),
    epsYoY: fmtPct(latest.epsYoY),
    marginDelta:
      marginDelta == null
        ? POST_EARNINGS_EMPTY.resultsNotPublished
        : marginDelta === 0
          ? "Flat"
          : `${marginDelta > 0 ? "+" : ""}${marginDelta} pts`,
    available: true,
    emptyMessage: "",
    trendPoints,
  };
}
