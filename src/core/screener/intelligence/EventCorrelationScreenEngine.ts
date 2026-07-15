/**
 * Institutional AI Screener — event correlation (Sprint 9D.R3).
 * Combines Earnings + News + Corporate Actions + Management into one AI event score.
 */

import { safeScreenText } from "../ScreenModels";
import {
  SCREEN_EVENT_EMPTY,
  emptyEventScreenResult,
  type EventScreenResult,
  type ScreenEventCandidate,
} from "./EventPresentationModels";
import type { EventRankingMode } from "./EventRankingEngine";
import {
  buildEventCard,
  finalizeEventScreen,
} from "./eventScreenHelpers";
import { scoreEventCandidate } from "./EventExplainabilityEngine";

export interface EventCorrelationOptions {
  earnings?: ScreenEventCandidate[];
  news?: ScreenEventCandidate[];
  corporateActions?: ScreenEventCandidate[];
  management?: ScreenEventCandidate[];
  /** Flat event list (any domain) */
  events?: ScreenEventCandidate[];
  rankingMode?: EventRankingMode;
  resultLimit?: number;
  minEventScore?: number;
  /** Require signals from at least N domains (default 1) */
  minDomains?: number;
}

function mergeByTicker(
  groups: ScreenEventCandidate[][]
): ScreenEventCandidate[] {
  const map = new Map<string, ScreenEventCandidate>();

  for (const group of groups) {
    for (const event of group) {
      const ticker = safeScreenText(event.ticker, "").toUpperCase();
      if (!ticker) continue;
      const prev = map.get(ticker);
      if (!prev) {
        map.set(ticker, {
          ...event,
          ticker,
          tags: [...(event.tags ?? [])],
          evidence: [...(event.evidence ?? [])],
        });
        continue;
      }

      const tags = new Set([
        ...(prev.tags ?? []).map((t) => String(t).toLowerCase()),
        ...(event.tags ?? []).map((t) => String(t).toLowerCase()),
      ]);
      const evidence = [
        ...(prev.evidence ?? []),
        ...(event.evidence ?? []),
      ].filter(Boolean);

      map.set(ticker, {
        ticker,
        company: prev.company || event.company,
        sector: prev.sector || event.sector,
        industry: prev.industry || event.industry,
        upcomingEvent: prev.upcomingEvent || event.upcomingEvent,
        tags: [...tags],
        domain: "earnings", // correlated — domain-agnostic scoring uses strengths
        inPortfolio: Boolean(prev.inPortfolio || event.inPortfolio),
        inWatchlist: Boolean(prev.inWatchlist || event.inWatchlist),
        opportunityScore: Math.max(
          Number(prev.opportunityScore) || 0,
          Number(event.opportunityScore) || 0
        ),
        trustScore: Math.max(
          Number(prev.trustScore) || 0,
          Number(event.trustScore) || 0
        ),
        validationScore: Math.max(
          Number(prev.validationScore) || 0,
          Number(event.validationScore) || 0
        ),
        confidence: Math.max(
          Number(prev.confidence) || 0,
          Number(event.confidence) || 0
        ),
        eventStrength: Math.max(
          Number(prev.eventStrength) || 0,
          Number(event.eventStrength) || 0
        ),
        newsStrength: Math.max(
          Number(prev.newsStrength) || 0,
          Number(event.newsStrength) || 0,
          event.domain === "news" ? Number(event.eventStrength) || 55 : 0
        ),
        earningsStrength: Math.max(
          Number(prev.earningsStrength) || 0,
          Number(event.earningsStrength) || 0,
          event.domain === "earnings" ? Number(event.eventStrength) || 55 : 0
        ),
        corporateActionStrength: Math.max(
          Number(prev.corporateActionStrength) || 0,
          Number(event.corporateActionStrength) || 0,
          event.domain === "corporate_action"
            ? Number(event.eventStrength) || 55
            : 0
        ),
        managementStrength: Math.max(
          Number(prev.managementStrength) || 0,
          Number(event.managementStrength) || 0,
          event.domain === "management" ? Number(event.eventStrength) || 55 : 0
        ),
        evidence,
        reasonSummary:
          prev.reasonSummary || event.reasonSummary || "Correlated event signal",
      });
    }
  }

  return [...map.values()];
}

function domainCount(candidate: ScreenEventCandidate): number {
  let n = 0;
  if ((candidate.earningsStrength ?? 0) > 0 || candidate.domain === "earnings")
    n += 1;
  if ((candidate.newsStrength ?? 0) > 0 || candidate.domain === "news") n += 1;
  if (
    (candidate.corporateActionStrength ?? 0) > 0 ||
    candidate.domain === "corporate_action"
  )
    n += 1;
  if (
    (candidate.managementStrength ?? 0) > 0 ||
    candidate.domain === "management"
  )
    n += 1;
  // Also count via tags domains heuristics
  const tags = (candidate.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => /earn|guidance|margin|eps|revenue/.test(t))) n = Math.max(n, 1);
  return n;
}

export function runEventScreen(
  options: EventCorrelationOptions = {}
): EventScreenResult {
  const earnings = (options.earnings ?? []).map((e) => ({
    ...e,
    domain: e.domain ?? ("earnings" as const),
  }));
  const news = (options.news ?? []).map((e) => ({
    ...e,
    domain: e.domain ?? ("news" as const),
  }));
  const corporateActions = (options.corporateActions ?? []).map((e) => ({
    ...e,
    domain: e.domain ?? ("corporate_action" as const),
  }));
  const management = (options.management ?? []).map((e) => ({
    ...e,
    domain: e.domain ?? ("management" as const),
  }));
  const flat = options.events ?? [];

  const merged = mergeByTicker([
    earnings,
    news,
    corporateActions,
    management,
    flat,
  ]);

  if (merged.length === 0) {
    return emptyEventScreenResult(
      "event",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }

  const minScore = options.minEventScore ?? 40;
  const minDomains = options.minDomains ?? 1;
  const cards = [];

  for (const candidate of merged) {
    const factors = scoreEventCandidate(candidate);
    if (factors.finalEventScore < minScore) continue;
    if (domainCount(candidate) < minDomains && (candidate.tags?.length ?? 0) === 0)
      continue;

    const matched = (candidate.tags ?? [])
      .map((t) => safeScreenText(t, ""))
      .filter(Boolean);
    if (matched.length === 0) {
      matched.push(safeScreenText(candidate.upcomingEvent, "Correlated Event"));
    }

    cards.push(buildEventCard(candidate, matched));
  }

  return finalizeEventScreen({
    mode: "event",
    cards,
    emptyMessage: SCREEN_EVENT_EMPTY.noEventMatches,
    rankingMode: options.rankingMode ?? "Overall",
    resultLimit: options.resultLimit,
  });
}

export class EventCorrelationScreenEngine {
  run(options?: EventCorrelationOptions): EventScreenResult {
    return runEventScreen(options);
  }
}
