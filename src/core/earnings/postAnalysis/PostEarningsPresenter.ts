/**
 * Post-earnings presenter — empty-safe card / drawer view models.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type {
  PostEarningsAnalysis,
  PostEarningsBadgeId,
  PostEarningsCardView,
  PostEarningsDrawerView,
  PostEarningsResearchReport,
} from "./PostEarningsModels";
import { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function toPostEarningsCardView(
  analysis: PostEarningsAnalysis | null
): PostEarningsCardView {
  if (!analysis || !analysis.comparison.available) {
    return {
      verdict: POST_EARNINGS_EMPTY.awaitingResults,
      confidence: POST_EARNINGS_EMPTY.awaitingResults,
      revenueBeat: POST_EARNINGS_EMPTY.resultsNotPublished,
      epsBeat: POST_EARNINGS_EMPTY.resultsNotPublished,
      guidance: POST_EARNINGS_EMPTY.guidanceNotAvailable,
      gapReaction: POST_EARNINGS_EMPTY.awaitingResults,
      badges: [],
      ready: false,
      emptyMessage: analysis?.released
        ? POST_EARNINGS_EMPTY.resultsNotPublished
        : POST_EARNINGS_EMPTY.awaitingResults,
    };
  }

  return {
    verdict: safeText(analysis.verdict.verdict, "Neutral"),
    confidence: safeText(
      analysis.verdict.confidence,
      POST_EARNINGS_EMPTY.awaitingResults
    ),
    revenueBeat: safeText(
      `${analysis.comparison.revenue.outcome} ${analysis.comparison.revenue.beatPercent}`,
      POST_EARNINGS_EMPTY.resultsNotPublished
    ),
    epsBeat: safeText(
      `${analysis.comparison.eps.outcome} ${analysis.comparison.eps.beatPercent}`,
      POST_EARNINGS_EMPTY.resultsNotPublished
    ),
    guidance: analysis.guidance.available
      ? analysis.guidance.change
      : POST_EARNINGS_EMPTY.guidanceNotAvailable,
    gapReaction: analysis.reaction.available
      ? analysis.reaction.gapLabel
      : POST_EARNINGS_EMPTY.awaitingResults,
    badges: analysis.badges,
    ready: true,
    emptyMessage: "",
  };
}

export function toPostEarningsDrawerView(input: {
  event: EarningsCalendarEvent;
  analysis: PostEarningsAnalysis;
  report: PostEarningsResearchReport;
}): PostEarningsDrawerView {
  return {
    title: "Institutional Post Earnings Analysis",
    subtitle: `${input.event.companyName} · ${input.event.ticker} · ${input.event.quarter} ${input.event.financialYear}`,
    card: toPostEarningsCardView(input.analysis),
    report: input.report,
    analysis: input.analysis,
    event: input.event,
  };
}

export function postBadgeVariant(
  badge: PostEarningsBadgeId
): "default" | "gain" | "loss" | "neutral" | "accent" {
  switch (badge) {
    case "Strong Beat":
    case "Beat":
    case "Guidance Upgrade":
    case "Margin Expansion":
      return "gain";
    case "Miss":
    case "Major Miss":
    case "Guidance Cut":
    case "Margin Compression":
      return "loss";
    case "Inline":
    default:
      return "neutral";
  }
}

export function buildPostEarningsBadges(
  analysis: Pick<
    PostEarningsAnalysis,
    "comparison" | "guidance" | "verdict"
  >
): PostEarningsBadgeId[] {
  const badges: PostEarningsBadgeId[] = [];
  if (analysis.comparison.available) {
    badges.push(analysis.comparison.overallOutcome);
  }
  if (analysis.guidance.available) {
    if (analysis.guidance.change === "Upgrade") badges.push("Guidance Upgrade");
    if (analysis.guidance.change === "Downgrade") badges.push("Guidance Cut");
  }
  if (analysis.comparison.margin.available) {
    const beat = analysis.comparison.margin.beatPercent;
    if (beat.startsWith("+")) badges.push("Margin Expansion");
    if (beat.startsWith("-")) badges.push("Margin Compression");
  }
  return [...new Set(badges)];
}
