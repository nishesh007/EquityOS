/**
 * Earnings preview presenter — safe card / drawer view models.
 * Never surfaces null / undefined / NaN / bare 0 to UI.
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type {
  EarningsCardPreviewView,
  EarningsDrawerView,
  EarningsPreviewSnapshot,
  EarningsResearchSummary,
  IntelligenceBadgeId,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN" ||
    trimmed === "0"
  ) {
    return fallback;
  }
  return trimmed;
}

function confidenceLabel(snapshot: EarningsPreviewSnapshot): string {
  if (!snapshot.confidence.available || snapshot.confidence.score == null) {
    return INTELLIGENCE_EMPTY.notEnoughConfidence;
  }
  if (!Number.isFinite(snapshot.confidence.score) || snapshot.confidence.score <= 0) {
    return INTELLIGENCE_EMPTY.notEnoughConfidence;
  }
  return String(Math.round(snapshot.confidence.score));
}

export function toEarningsCardPreviewView(
  snapshot: EarningsPreviewSnapshot | null
): EarningsCardPreviewView {
  if (!snapshot) {
    return {
      outlook: INTELLIGENCE_EMPTY.awaitingEarnings,
      confidence: INTELLIGENCE_EMPTY.notEnoughConfidence,
      expectedRevenue: INTELLIGENCE_EMPTY.consensusNotAvailable,
      expectedEps: INTELLIGENCE_EMPTY.consensusNotAvailable,
      expectedMarginTrend: INTELLIGENCE_EMPTY.insufficientHistory,
      expectedVolatility: INTELLIGENCE_EMPTY.awaitingEarnings,
      institutionalInterest: INTELLIGENCE_EMPTY.noAnalystCoverage,
      historicalBeatRate: INTELLIGENCE_EMPTY.insufficientHistory,
      consensusDirection: INTELLIGENCE_EMPTY.consensusNotAvailable,
      importantWatchItem: INTELLIGENCE_EMPTY.awaitingEarnings,
      badges: [],
      ready: false,
      emptyMessage: INTELLIGENCE_EMPTY.awaitingEarnings,
    };
  }

  const ready =
    snapshot.expectation.available ||
    snapshot.surprise.available ||
    snapshot.confidence.available;

  return {
    outlook: safeText(snapshot.outlook, "Neutral"),
    confidence: confidenceLabel(snapshot),
    expectedRevenue: snapshot.expectation.available
      ? snapshot.expectation.revenue
      : INTELLIGENCE_EMPTY.insufficientHistory,
    expectedEps: snapshot.expectation.available
      ? snapshot.expectation.eps
      : INTELLIGENCE_EMPTY.insufficientHistory,
    expectedMarginTrend: snapshot.expectation.available
      ? snapshot.expectation.marginTrend
      : INTELLIGENCE_EMPTY.insufficientHistory,
    expectedVolatility: snapshot.risk.available
      ? snapshot.risk.expectedVolatility
      : INTELLIGENCE_EMPTY.awaitingEarnings,
    institutionalInterest: snapshot.risk.available
      ? snapshot.risk.institutionalInterest
      : INTELLIGENCE_EMPTY.noAnalystCoverage,
    historicalBeatRate: safeText(
      snapshot.historicalBeatRateLabel,
      INTELLIGENCE_EMPTY.insufficientHistory
    ),
    consensusDirection: safeText(
      snapshot.consensusDirectionLabel,
      INTELLIGENCE_EMPTY.consensusNotAvailable
    ),
    importantWatchItem: safeText(
      snapshot.importantWatchItem,
      INTELLIGENCE_EMPTY.awaitingEarnings
    ),
    badges: snapshot.badges,
    ready,
    emptyMessage: ready ? "" : INTELLIGENCE_EMPTY.awaitingEarnings,
  };
}

export function toEarningsDrawerView(input: {
  event: EarningsCalendarEvent;
  snapshot: EarningsPreviewSnapshot;
  research: EarningsResearchSummary;
}): EarningsDrawerView {
  return {
    title: "Institutional Earnings Research",
    subtitle: `${input.event.companyName} · ${input.event.ticker} · ${input.event.quarter} ${input.event.financialYear}`,
    preview: toEarningsCardPreviewView(input.snapshot),
    research: input.research,
    event: input.event,
  };
}

export function badgeVariant(
  badge: IntelligenceBadgeId
): "default" | "gain" | "loss" | "neutral" | "accent" {
  switch (badge) {
    case "High Conviction":
    case "Beat Probability":
    case "Momentum":
    case "Turnaround":
    case "Undervalued":
      return "gain";
    case "Expensive":
      return "loss";
    case "High Impact":
      return "accent";
    case "Portfolio":
    case "Watchlist":
    default:
      return "neutral";
  }
}
