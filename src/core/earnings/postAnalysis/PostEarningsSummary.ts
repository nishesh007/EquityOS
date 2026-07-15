/**
 * Post-earnings research report narrative composition.
 */

import type { EarningsResearchContext } from "@/src/core/earnings/intelligence";
import type { ActualsComparisonView } from "./EarningsComparisonEngine";
import type {
  EstimateComparisonView,
  GuidanceSummaryView,
  MarketReactionView,
  PostEarningsResearchReport,
  PostEarningsVerdictView,
} from "./PostEarningsModels";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

export function getPostEarningsVerdict(input: {
  comparison: EstimateComparisonView;
  guidance: GuidanceSummaryView;
  reaction: MarketReactionView;
}): PostEarningsVerdictView {
  if (!input.comparison.available) {
    return {
      verdict: "Neutral",
      confidence: POST_EARNINGS_EMPTY.awaitingResults,
      available: false,
      emptyMessage: POST_EARNINGS_EMPTY.resultsNotPublished,
    };
  }

  let score = 0;
  switch (input.comparison.overallOutcome) {
    case "Strong Beat":
      score += 3;
      break;
    case "Beat":
      score += 2;
      break;
    case "Inline":
      break;
    case "Miss":
      score -= 2;
      break;
    case "Major Miss":
      score -= 3;
      break;
  }

  if (input.guidance.available) {
    if (input.guidance.change === "Upgrade") score += 1;
    if (input.guidance.change === "Downgrade") score -= 1;
  }

  if (input.reaction.available) {
    if (input.reaction.gapLabel === "Gap Up") score += 1;
    if (input.reaction.gapLabel === "Gap Down") score -= 1;
    if (input.reaction.institutionalFlow === "Institutional Buying") score += 1;
    if (input.reaction.institutionalFlow === "Institutional Selling") score -= 1;
  }

  let verdict: PostEarningsVerdictView["verdict"] = "Neutral";
  if (score >= 4) verdict = "Very Positive";
  else if (score >= 2) verdict = "Positive";
  else if (score <= -4) verdict = "Very Negative";
  else if (score <= -2) verdict = "Negative";

  const confidence = Math.max(40, Math.min(92, 58 + Math.abs(score) * 6));

  return {
    verdict,
    confidence: String(confidence),
    available: true,
    emptyMessage: "",
  };
}

export function buildPostEarningsReport(input: {
  context: EarningsResearchContext;
  comparison: EstimateComparisonView;
  guidance: GuidanceSummaryView;
  reaction: MarketReactionView;
  verdict: PostEarningsVerdictView;
  actuals: ActualsComparisonView;
}): PostEarningsResearchReport {
  const { context, comparison, guidance, reaction, verdict, actuals } = input;

  if (!comparison.available) {
    return {
      executiveSummary: POST_EARNINGS_EMPTY.resultsNotPublished,
      whatHappened: POST_EARNINGS_EMPTY.awaitingResults,
      biggestPositives: [],
      biggestNegatives: [],
      estimateComparison: POST_EARNINGS_EMPTY.awaitingResults,
      guidanceAnalysis: POST_EARNINGS_EMPTY.guidanceNotAvailable,
      marginAnalysis: POST_EARNINGS_EMPTY.resultsNotPublished,
      cashFlowHighlights: POST_EARNINGS_EMPTY.resultsNotPublished,
      managementCommentary: POST_EARNINGS_EMPTY.commentaryPending,
      aiVerdict: POST_EARNINGS_EMPTY.awaitingResults,
      confidence: POST_EARNINGS_EMPTY.awaitingResults,
      expectedMediumTermImpact: POST_EARNINGS_EMPTY.awaitingResults,
      revenueTrend: [],
      epsTrend: [],
      marginTrend: [],
      surpriseTrend: [],
      empty: true,
      emptyMessage: POST_EARNINGS_EMPTY.resultsNotPublished,
    };
  }

  const positives: string[] = [];
  const negatives: string[] = [];

  if (
    comparison.revenue.outcome === "Beat" ||
    comparison.revenue.outcome === "Strong Beat"
  ) {
    positives.push(`Revenue ${comparison.revenue.outcome.toLowerCase()} (${comparison.revenue.beatPercent}).`);
  } else if (
    comparison.revenue.outcome === "Miss" ||
    comparison.revenue.outcome === "Major Miss"
  ) {
    negatives.push(`Revenue ${comparison.revenue.outcome.toLowerCase()} (${comparison.revenue.beatPercent}).`);
  }

  if (
    comparison.eps.outcome === "Beat" ||
    comparison.eps.outcome === "Strong Beat"
  ) {
    positives.push(`EPS ${comparison.eps.outcome.toLowerCase()} (${comparison.eps.beatPercent}).`);
  } else if (
    comparison.eps.outcome === "Miss" ||
    comparison.eps.outcome === "Major Miss"
  ) {
    negatives.push(`EPS ${comparison.eps.outcome.toLowerCase()} (${comparison.eps.beatPercent}).`);
  }

  if (guidance.change === "Upgrade") {
    positives.push("Guidance upgraded versus prior trajectory.");
  } else if (guidance.change === "Downgrade") {
    negatives.push("Guidance softened / cut risk elevated.");
  }

  if (reaction.gapLabel === "Gap Up") {
    positives.push(`Market opened ${reaction.gapLabel.toLowerCase()}.`);
  } else if (reaction.gapLabel === "Gap Down") {
    negatives.push(`Market opened ${reaction.gapLabel.toLowerCase()}.`);
  }

  if (positives.length === 0) {
    positives.push("Print largely in line with modeled expectations.");
  }
  if (negatives.length === 0) {
    negatives.push("No material downside surprise versus estimates.");
  }

  const impact =
    verdict.verdict === "Very Positive" || verdict.verdict === "Positive"
      ? "Medium-term bias constructive if delivery confirms institutional support."
      : verdict.verdict === "Very Negative" || verdict.verdict === "Negative"
        ? "Medium-term bias cautious until guidance and margins stabilize."
        : "Medium-term impact likely stock-specific; wait for peer cluster confirmation.";

  return {
    executiveSummary: `${context.event.companyName} (${context.event.ticker}) printed ${context.event.quarter} ${context.event.financialYear} with an overall ${comparison.overallOutcome}. AI verdict: ${verdict.verdict}.`,
    whatHappened: `Revenue ${comparison.revenue.actual} vs ${comparison.revenue.estimate} (${comparison.revenue.beatPercent}); EPS ${comparison.eps.actual} vs ${comparison.eps.estimate} (${comparison.eps.beatPercent}).`,
    biggestPositives: positives,
    biggestNegatives: negatives,
    estimateComparison: `Overall ${comparison.overallOutcome}. PAT ${comparison.pat.beatPercent}; EBITDA ${comparison.ebitda.beatPercent}; Op. margin ${comparison.operatingMargin.beatPercent}.`,
    guidanceAnalysis: guidance.available
      ? `${guidance.change}: ${guidance.current}`
      : POST_EARNINGS_EMPTY.guidanceNotAvailable,
    marginAnalysis: `Margin ${comparison.margin.actual} vs ${comparison.margin.estimate} (${comparison.margin.beatPercent}). QoQ margin ${actuals.marginDelta}.`,
    cashFlowHighlights:
      comparison.pat.available
        ? `PAT ${comparison.pat.actual} with EPS QoQ ${actuals.epsQoQ} / YoY ${actuals.epsYoY}.`
        : POST_EARNINGS_EMPTY.resultsNotPublished,
    managementCommentary: guidance.commentary || POST_EARNINGS_EMPTY.commentaryPending,
    aiVerdict: verdict.available ? verdict.verdict : POST_EARNINGS_EMPTY.awaitingResults,
    confidence: verdict.available ? verdict.confidence : POST_EARNINGS_EMPTY.awaitingResults,
    expectedMediumTermImpact: impact,
    revenueTrend: actuals.trendPoints,
    epsTrend: actuals.trendPoints,
    marginTrend: actuals.trendPoints,
    surpriseTrend: actuals.trendPoints.map((p) => ({
      label: p.label,
      result: p.surprise,
    })),
    empty: false,
    emptyMessage: "",
  };
}
