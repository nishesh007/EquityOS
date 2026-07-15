/**
 * Institutional AI Screener — event ranking (Sprint 9D.R3).
 */

import type { EventResultCard } from "./EventPresentationModels";

export type EventRankingMode =
  | "Overall"
  | "Earnings"
  | "News"
  | "CorporateAction"
  | "Management"
  | "Confidence";

function rankKey(card: EventResultCard, mode: EventRankingMode): number {
  const f = card.factors;
  switch (mode) {
    case "Earnings":
      return f.earningsStrength;
    case "News":
      return f.newsStrength;
    case "CorporateAction":
      return f.corporateActionStrength;
    case "Management":
      return f.eventStrength * 0.6 + f.confidence * 0.4;
    case "Confidence":
      return f.confidence;
    case "Overall":
    default:
      return f.finalEventScore;
  }
}

export function rankEventResults(
  cards: EventResultCard[],
  mode: EventRankingMode = "Overall"
): EventResultCard[] {
  const sorted = [...cards].sort((a, b) => {
    const diff = rankKey(b, mode) - rankKey(a, mode);
    if (diff !== 0) return diff;
    return b.eventScore - a.eventScore;
  });
  return sorted.map((card, index) => ({ ...card, rank: index + 1 }));
}

export class EventRankingEngine {
  rank(
    cards: EventResultCard[],
    mode: EventRankingMode = "Overall"
  ): EventResultCard[] {
    return rankEventResults(cards, mode);
  }
}
