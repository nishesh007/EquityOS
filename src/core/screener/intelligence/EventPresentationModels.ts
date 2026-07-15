/**
 * Institutional AI Screener — event presentation models (Sprint 9D.R3).
 * Event-driven result cards & empty states. Never surface null / undefined / NaN.
 */

import {
  safeScreenNumber,
  safeScreenText,
} from "../ScreenModels";

export const SCREEN_EVENT_EMPTY = {
  noEarningsMatches: "No Earnings Matches",
  noNewsMatches: "No News Matches",
  noCorporateActions: "No Corporate Actions",
  noEventMatches: "No Event Matches",
  awaitingEventScan: "Awaiting Event Scan",
} as const;

export type ScreenEventEmptyMessage =
  (typeof SCREEN_EVENT_EMPTY)[keyof typeof SCREEN_EVENT_EMPTY];

export type EventScreenMode =
  | "earnings"
  | "news"
  | "corporate-action"
  | "management"
  | "event";

/** Shared event candidate — composition input from 9B/9C engines. */
export interface ScreenEventCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  /** Upcoming / primary event label already resolved by source engines */
  upcomingEvent?: string | null;
  /** Classification tags matching screen filters (e.g. "upcoming_earnings", "dividend") */
  tags?: string[] | null;
  /** Domain: earnings | news | corporate_action | management */
  domain?: "earnings" | "news" | "corporate_action" | "management" | null;
  inPortfolio?: boolean | null;
  inWatchlist?: boolean | null;
  opportunityScore?: number | null;
  trustScore?: number | null;
  validationScore?: number | null;
  confidence?: number | null;
  eventStrength?: number | null;
  newsStrength?: number | null;
  earningsStrength?: number | null;
  corporateActionStrength?: number | null;
  managementStrength?: number | null;
  evidence?: string[] | null;
  reasonSummary?: string | null;
}

export interface EventScoreFactors {
  opportunityScore: number;
  trustScore: number;
  validationScore: number;
  confidence: number;
  eventStrength: number;
  newsStrength: number;
  earningsStrength: number;
  corporateActionStrength: number;
  /** Final Event Score 0–100 */
  finalEventScore: number;
}

export interface EventExplainability {
  whyMatched: string;
  supportingEvent: string;
  matchedRules: string[];
  confidence: number;
  positiveDrivers: string[];
  negativeDrivers: string[];
  aiReasoning: string;
  evidence: string[];
  empty: boolean;
  emptyMessage: ScreenEventEmptyMessage;
}

export interface EventResultCard {
  company: string;
  ticker: string;
  sector: string;
  upcomingEvent: string;
  eventScore: number;
  aiScore: number;
  trust: number;
  validation: number;
  confidence: number;
  reasonSummary: string;
  matchedEvents: string[];
  rank: number;
  factors: EventScoreFactors;
  explainability: EventExplainability;
}

export interface EventScreenResult {
  mode: EventScreenMode;
  cards: EventResultCard[];
  totalMatches: number;
  empty: boolean;
  emptyMessage: ScreenEventEmptyMessage;
  generatedAt: string;
}

export function emptyEventScoreFactors(): EventScoreFactors {
  return {
    opportunityScore: 0,
    trustScore: 0,
    validationScore: 0,
    confidence: 0,
    eventStrength: 0,
    newsStrength: 0,
    earningsStrength: 0,
    corporateActionStrength: 0,
    finalEventScore: 0,
  };
}

export function emptyEventExplainability(
  message: ScreenEventEmptyMessage = SCREEN_EVENT_EMPTY.awaitingEventScan
): EventExplainability {
  return {
    whyMatched: message,
    supportingEvent: message,
    matchedRules: [],
    confidence: 0,
    positiveDrivers: [],
    negativeDrivers: [],
    aiReasoning: message,
    evidence: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyEventScreenResult(
  mode: EventScreenMode,
  message: ScreenEventEmptyMessage = SCREEN_EVENT_EMPTY.awaitingEventScan
): EventScreenResult {
  return {
    mode,
    cards: [],
    totalMatches: 0,
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeEventResultCard(
  input: {
    ticker: string;
    company?: string | null;
    sector?: string | null;
    upcomingEvent?: string | null;
    eventScore?: number | null;
    aiScore?: number | null;
    trust?: number | null;
    validation?: number | null;
    confidence?: number | null;
    reasonSummary?: string | null;
    matchedEvents?: string[] | null;
    rank?: number | null;
    factors?: EventScoreFactors | null;
    explainability?: EventExplainability | null;
  }
): EventResultCard {
  const factors = input.factors ?? emptyEventScoreFactors();
  return {
    company: safeScreenText(input.company, "—"),
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    sector: safeScreenText(input.sector, "—"),
    upcomingEvent: safeScreenText(input.upcomingEvent, "—"),
    eventScore: safeScreenNumber(input.eventScore, factors.finalEventScore),
    aiScore: safeScreenNumber(input.aiScore, factors.opportunityScore),
    trust: safeScreenNumber(input.trust, factors.trustScore),
    validation: safeScreenNumber(input.validation, factors.validationScore),
    confidence: safeScreenNumber(input.confidence, factors.confidence),
    reasonSummary: safeScreenText(input.reasonSummary, "No reason available"),
    matchedEvents: Array.isArray(input.matchedEvents)
      ? input.matchedEvents.map((e) => safeScreenText(e, "")).filter(Boolean)
      : [],
    rank: Math.max(0, Math.floor(safeScreenNumber(input.rank, 0))),
    factors: {
      opportunityScore: safeScreenNumber(factors.opportunityScore, 0),
      trustScore: safeScreenNumber(factors.trustScore, 0),
      validationScore: safeScreenNumber(factors.validationScore, 0),
      confidence: safeScreenNumber(factors.confidence, 0),
      eventStrength: safeScreenNumber(factors.eventStrength, 0),
      newsStrength: safeScreenNumber(factors.newsStrength, 0),
      earningsStrength: safeScreenNumber(factors.earningsStrength, 0),
      corporateActionStrength: safeScreenNumber(
        factors.corporateActionStrength,
        0
      ),
      finalEventScore: safeScreenNumber(factors.finalEventScore, 0),
    },
    explainability: input.explainability ?? emptyEventExplainability(),
  };
}

export function candidateTags(candidate: ScreenEventCandidate): string[] {
  return (candidate.tags ?? [])
    .map((t) => safeScreenText(t, "").toLowerCase())
    .filter(Boolean);
}

export function candidateHasTag(
  candidate: ScreenEventCandidate,
  ...needles: string[]
): boolean {
  const tags = candidateTags(candidate);
  return needles.some((n) => tags.includes(n.toLowerCase()));
}
