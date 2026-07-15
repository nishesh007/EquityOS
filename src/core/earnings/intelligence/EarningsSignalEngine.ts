/**
 * Earnings signal engine — AI outlook badges and watch items.
 */

import type {
  AIOutlook,
  EarningsResearchContext,
  EarningsSignalView,
  IntelligenceBadgeId,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";
import type { AIExpectationView } from "./EarningsIntelligenceModels";
import type { ExpectedSurpriseView } from "./EarningsIntelligenceModels";
import type { EarningsConfidenceView } from "./EarningsIntelligenceModels";

export function deriveAIOutlook(input: {
  expectation: AIExpectationView;
  surprise: ExpectedSurpriseView;
  confidence: EarningsConfidenceView;
  revenueGrowth: number | null;
}): AIOutlook {
  if (!input.expectation.available && !input.surprise.available) {
    return "Neutral";
  }

  let score = 0;
  if (input.expectation.revenue === "Expected Beat") score += 2;
  if (input.expectation.revenue === "Miss") score -= 2;
  if (input.expectation.eps === "Expected Beat") score += 2;
  if (input.expectation.eps === "Miss") score -= 2;
  if (input.expectation.marginTrend === "Expand") score += 1;
  if (input.expectation.marginTrend === "Compress") score -= 1;
  if (input.surprise.direction === "Expected Beat") score += 1;
  if (input.surprise.direction === "Miss") score -= 1;
  if (input.revenueGrowth != null && input.revenueGrowth > 12) score += 1;
  if (input.revenueGrowth != null && input.revenueGrowth < 0) score -= 1;

  if (score >= 3) return "Bullish";
  if (score <= -2) return "Bearish";
  return "Neutral";
}

export function buildIntelligenceBadges(input: {
  context: EarningsResearchContext;
  outlook: AIOutlook;
  surprise: ExpectedSurpriseView;
  confidence: EarningsConfidenceView;
}): IntelligenceBadgeId[] {
  const badges: IntelligenceBadgeId[] = [];
  const { context, outlook, surprise, confidence } = input;

  if (context.event.highConviction) badges.push("High Conviction");
  if (
    surprise.available &&
    surprise.direction === "Expected Beat" &&
    (confidence.score ?? 0) >= 60
  ) {
    badges.push("Beat Probability");
  }
  if (outlook === "Bullish" && (context.revenueGrowth ?? 0) > 10) {
    badges.push("Momentum");
  }
  if (
    outlook === "Bullish" &&
    context.quarters.length >= 3 &&
    (context.netProfitGrowth ?? 0) > (context.revenueGrowth ?? 0) + 3
  ) {
    badges.push("Turnaround");
  }
  if (context.valuationStatus === "undervalued") badges.push("Undervalued");
  if (context.valuationStatus === "overvalued") badges.push("Expensive");
  if (context.event.inPortfolio) badges.push("Portfolio");
  if (context.event.inWatchlist) badges.push("Watchlist");
  if (context.event.highImpact) badges.push("High Impact");

  return [...new Set(badges)];
}

export function buildImportantWatchItem(
  context: EarningsResearchContext,
  outlook: AIOutlook
): string {
  if (context.event.highImpact && context.event.fno) {
    return "Watch gap risk and delivery into the F&O print.";
  }
  if (outlook === "Bullish") {
    return `Watch ${context.event.quarter} margin trajectory vs street.`;
  }
  if (outlook === "Bearish") {
    return "Watch downside guidance and operating leverage.";
  }
  return `Monitor ${context.event.sector} peers around the result window.`;
}

export function buildEarningsSignalView(input: {
  context: EarningsResearchContext;
  expectation: AIExpectationView;
  surprise: ExpectedSurpriseView;
  confidence: EarningsConfidenceView;
}): EarningsSignalView {
  const { context, expectation, surprise, confidence } = input;

  if (!expectation.available && !surprise.available) {
    return {
      outlook: "Neutral",
      badges: buildIntelligenceBadges({
        context,
        outlook: "Neutral",
        surprise,
        confidence,
      }),
      importantWatchItem: INTELLIGENCE_EMPTY.insufficientHistory,
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.insufficientHistory,
    };
  }

  if (confidence.available === false && (confidence.score == null || confidence.score < 35)) {
    return {
      outlook: "Neutral",
      badges: buildIntelligenceBadges({
        context,
        outlook: "Neutral",
        surprise,
        confidence,
      }),
      importantWatchItem: INTELLIGENCE_EMPTY.notEnoughConfidence,
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.notEnoughConfidence,
    };
  }

  const outlook = deriveAIOutlook({
    expectation,
    surprise,
    confidence,
    revenueGrowth: context.revenueGrowth,
  });

  return {
    outlook,
    badges: buildIntelligenceBadges({ context, outlook, surprise, confidence }),
    importantWatchItem: buildImportantWatchItem(context, outlook),
    available: true,
    emptyMessage: "",
  };
}
