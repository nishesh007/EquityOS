/**
 * Shared helpers for event screen engines (Sprint 9D.R3).
 */

import {
  buildEventExplainability,
  scoreEventCandidate,
} from "./EventExplainabilityEngine";
import {
  emptyEventScreenResult,
  normalizeEventResultCard,
  type EventResultCard,
  type EventScreenMode,
  type EventScreenResult,
  type ScreenEventCandidate,
  type ScreenEventEmptyMessage,
} from "./EventPresentationModels";
import { rankEventResults, type EventRankingMode } from "./EventRankingEngine";
import { safeScreenText } from "../ScreenModels";

export function buildEventCard(
  candidate: ScreenEventCandidate,
  matchedLabels: string[]
): EventResultCard {
  const factors = scoreEventCandidate(candidate);
  const matchedEvents = matchedLabels
    .map((l) => safeScreenText(l, ""))
    .filter(Boolean);
  const explainability = buildEventExplainability({
    ticker: candidate.ticker,
    company: candidate.company,
    matchedRules: matchedEvents,
    supportingEvent: candidate.upcomingEvent ?? matchedEvents[0],
    factors,
    reasonSummary: candidate.reasonSummary,
    evidence: candidate.evidence ?? matchedEvents,
  });

  return normalizeEventResultCard({
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector,
    upcomingEvent: candidate.upcomingEvent ?? matchedEvents[0] ?? "—",
    eventScore: factors.finalEventScore,
    aiScore: factors.opportunityScore,
    trust: factors.trustScore,
    validation: factors.validationScore,
    confidence: factors.confidence,
    reasonSummary:
      candidate.reasonSummary ||
      matchedEvents.slice(0, 3).join(", ") ||
      "Event screen match",
    matchedEvents,
    factors,
    explainability,
  });
}

export function finalizeEventScreen(input: {
  mode: EventScreenMode;
  cards: EventResultCard[];
  emptyMessage: ScreenEventEmptyMessage;
  rankingMode?: EventRankingMode;
  resultLimit?: number;
}): EventScreenResult {
  if (input.cards.length === 0) {
    return emptyEventScreenResult(input.mode, input.emptyMessage);
  }
  const ranked = rankEventResults(input.cards, input.rankingMode ?? "Overall");
  const limited = ranked.slice(0, input.resultLimit ?? 50);
  return {
    mode: input.mode,
    cards: limited,
    totalMatches: limited.length,
    empty: false,
    emptyMessage: input.emptyMessage,
    generatedAt: new Date().toISOString(),
  };
}

export function hasAnyTag(
  candidate: ScreenEventCandidate,
  ids: string[]
): boolean {
  const tags = new Set(
    (candidate.tags ?? []).map((t) => String(t).toLowerCase())
  );
  return ids.some((id) => tags.has(id.toLowerCase()));
}
