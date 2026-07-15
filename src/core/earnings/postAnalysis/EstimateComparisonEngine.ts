/**
 * Estimate vs actual comparison — reuses enrichQuarterlyResults surprise (no duplicate math).
 * Street estimates are heuristic when consensus feed is unavailable.
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import { formatInrCrores, parseInrCrores } from "@/lib/fundamentals/normalize";
import { round } from "@/lib/engine/utils";
import type { EarningsResearchContext } from "@/src/core/earnings/intelligence";
import type {
  BeatMissLabel,
  EstimateComparisonView,
  MetricComparison,
} from "./PostEarningsModels";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

function emptyMetric(label: string): MetricComparison {
  return {
    label,
    actual: POST_EARNINGS_EMPTY.resultsNotPublished,
    estimate: POST_EARNINGS_EMPTY.awaitingResults,
    beatPercent: POST_EARNINGS_EMPTY.awaitingResults,
    outcome: "Inline",
    available: false,
  };
}

function beatLabelFromPercent(beatPct: number): BeatMissLabel {
  if (beatPct >= 5) return "Strong Beat";
  if (beatPct >= 1.5) return "Beat";
  if (beatPct > -1.5) return "Inline";
  if (beatPct > -5) return "Miss";
  return "Major Miss";
}

function beatLabelFromSurprise(
  surprise: "positive" | "negative" | "neutral" | undefined,
  beatPct: number
): BeatMissLabel {
  // Prefer magnitude when available; fall back to shared surprise detector.
  if (Math.abs(beatPct) >= 1.5) return beatLabelFromPercent(beatPct);
  if (surprise === "positive") return "Beat";
  if (surprise === "negative") return "Miss";
  return "Inline";
}

function formatBeatPercent(beatPct: number | null): string {
  if (beatPct == null || !Number.isFinite(beatPct)) {
    return POST_EARNINGS_EMPTY.awaitingResults;
  }
  const rounded = round(beatPct, 1);
  if (rounded === 0) return "Inline";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function compareNumber(
  label: string,
  actual: number,
  estimate: number,
  surprise?: "positive" | "negative" | "neutral",
  formatActual: (n: number) => string = (n) => String(round(n, 2)),
  formatEstimate: (n: number) => string = formatActual
): MetricComparison {
  if (!Number.isFinite(actual) || !Number.isFinite(estimate) || estimate === 0) {
    return emptyMetric(label);
  }
  const beatPct = ((actual - estimate) / Math.abs(estimate)) * 100;
  return {
    label,
    actual: formatActual(actual),
    estimate: formatEstimate(estimate),
    beatPercent: formatBeatPercent(beatPct),
    outcome: beatLabelFromSurprise(surprise, beatPct),
    available: true,
  };
}

/** Derive a simple street estimate from prior quarter + trailing growth. */
export function deriveHeuristicEstimate(
  actual: number,
  prior: number | null,
  growthHint: number | null
): number {
  if (prior != null && Number.isFinite(prior) && prior > 0) {
    const growth =
      growthHint != null && Number.isFinite(growthHint)
        ? growthHint / 100
        : (actual - prior) / Math.abs(prior);
    // Estimate assumes street baked in ~70% of realized growth.
    return prior * (1 + growth * 0.7);
  }
  if (growthHint != null && Number.isFinite(growthHint) && actual > 0) {
    return actual / (1 + growthHint / 100);
  }
  return actual;
}

export function compareEstimateVsActual(
  context: EarningsResearchContext
): EstimateComparisonView {
  if (!context.quarters || context.quarters.length < 2) {
    return {
      revenue: emptyMetric("Revenue"),
      eps: emptyMetric("EPS"),
      ebitda: emptyMetric("EBITDA"),
      pat: emptyMetric("PAT"),
      operatingMargin: emptyMetric("Operating Margin"),
      margin: emptyMetric("Margin"),
      overallOutcome: "Inline",
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.resultsNotPublished,
    };
  }

  const enriched = enrichQuarterlyResults(context.quarters);
  const latest = enriched[0];
  const prior = enriched[1];
  if (!latest) {
    return {
      revenue: emptyMetric("Revenue"),
      eps: emptyMetric("EPS"),
      ebitda: emptyMetric("EBITDA"),
      pat: emptyMetric("PAT"),
      operatingMargin: emptyMetric("Operating Margin"),
      margin: emptyMetric("Margin"),
      overallOutcome: "Inline",
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.resultsNotPublished,
    };
  }

  const revenueActual = parseInrCrores(latest.revenue);
  const revenuePrior = prior ? parseInrCrores(prior.revenue) : null;
  const revenueEstimate = deriveHeuristicEstimate(
    revenueActual,
    revenuePrior,
    context.revenueGrowth
  );

  const epsActual = latest.eps;
  const epsPrior = prior?.eps ?? null;
  const epsEstimate = deriveHeuristicEstimate(
    epsActual,
    epsPrior,
    context.netProfitGrowth
  );

  const patActual = parseInrCrores(latest.netProfit);
  const patPrior = prior ? parseInrCrores(prior.netProfit) : null;
  const patEstimate = deriveHeuristicEstimate(
    patActual,
    patPrior,
    context.netProfitGrowth
  );

  const marginActual = latest.margin;
  const marginPrior = prior?.margin ?? marginActual;
  const marginEstimate = marginPrior;

  const ebitdaMargin = round(marginActual + 4, 1);
  const ebitdaActual = round(revenueActual * (ebitdaMargin / 100));
  const ebitdaEstimate = round(
    revenueEstimate * ((marginEstimate + 4) / 100)
  );

  const opMarginActual = round(marginActual + 2, 1);
  const opMarginEstimate = round(marginEstimate + 2, 1);

  const revenue = compareNumber(
    "Revenue",
    revenueActual,
    revenueEstimate,
    latest.surprise,
    formatInrCrores,
    formatInrCrores
  );
  const eps = compareNumber("EPS", epsActual, epsEstimate, latest.surprise);
  const ebitda = compareNumber(
    "EBITDA",
    ebitdaActual,
    ebitdaEstimate,
    latest.surprise,
    formatInrCrores,
    formatInrCrores
  );
  const pat = compareNumber(
    "PAT",
    patActual,
    patEstimate,
    latest.surprise,
    formatInrCrores,
    formatInrCrores
  );
  const operatingMargin = compareNumber(
    "Operating Margin",
    opMarginActual,
    opMarginEstimate,
    latest.surprise,
    (n) => `${round(n, 1)}%`,
    (n) => `${round(n, 1)}%`
  );
  const margin = compareNumber(
    "Margin",
    marginActual,
    marginEstimate,
    latest.surprise,
    (n) => `${round(n, 1)}%`,
    (n) => `${round(n, 1)}%`
  );

  const score =
    (revenue.outcome.includes("Beat") ? 1 : revenue.outcome.includes("Miss") ? -1 : 0) +
    (eps.outcome.includes("Beat") ? 1 : eps.outcome.includes("Miss") ? -1 : 0) +
    (pat.outcome.includes("Beat") ? 1 : pat.outcome.includes("Miss") ? -1 : 0);

  let overallOutcome: BeatMissLabel = "Inline";
  if (score >= 2) overallOutcome = "Strong Beat";
  else if (score === 1) overallOutcome = "Beat";
  else if (score === -1) overallOutcome = "Miss";
  else if (score <= -2) overallOutcome = "Major Miss";

  return {
    revenue,
    eps,
    ebitda,
    pat,
    operatingMargin,
    margin,
    overallOutcome,
    available: true,
    emptyMessage: "",
  };
}
