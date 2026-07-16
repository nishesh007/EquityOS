/**
 * Watchlist History Engine — timeline & event history (Sprint 10B.R5).
 * Composes R3 changes + R4 workspace timeline + research bridge.
 */

import { getWatchlistChanges } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getWatchlistResearch } from "../workspace";
import { getWatchlistTimeline } from "../workspace";
import {
  WATCHLIST_ANALYTICS_EMPTY,
  emptyHistoryView,
  safeAnalyticsText,
  type HistoryEntry,
  type WatchlistAnalyticsContext,
  type WatchlistHistoryView,
} from "./WatchlistAnalyticsModels";

function toEntry(
  ticker: string,
  kind: string,
  summary: string,
  at: string
): HistoryEntry {
  return {
    ticker: ticker.toUpperCase(),
    kind,
    summary: safeAnalyticsText(summary, kind),
    at,
  };
}

export function getWatchlistHistory(
  context?: WatchlistAnalyticsContext | null
): WatchlistHistoryView {
  const watchlistId = safeAnalyticsText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!watchlistId && !symbols.length) {
    return emptyHistoryView();
  }

  const intelCtx = {
    ...context,
    watchlistId,
    symbols,
  } satisfies WatchlistIntelligenceContext;

  const changes = getWatchlistChanges(intelCtx);
  const timeline = getWatchlistTimeline({
    watchlistId,
    symbols,
    snapshots: context?.snapshots,
    now: context?.now,
  });
  const research = getWatchlistResearch({
    watchlistId,
    symbols,
    workspaceId: context?.workspaceId,
    snapshots: context?.snapshots,
    now: context?.now,
  });

  const addedTimeline: HistoryEntry[] = timeline.entries
    .filter((e) => e.kind === "added")
    .map((e) => toEntry(e.ticker, e.kind, e.summary, e.at));

  const removedTimeline: HistoryEntry[] = timeline.entries
    .filter((e) => e.kind === "removed")
    .map((e) => toEntry(e.ticker, e.kind, e.summary, e.at));

  const performanceHistory: HistoryEntry[] = changes.items
    .filter((c) => c.kind === "price_movement" || c.kind === "conviction_change")
    .map((c) => toEntry(c.ticker, c.kind, c.summary, c.at));

  const aiRecommendationHistory: HistoryEntry[] = timeline.entries
    .filter((e) => e.kind === "ai_recommendation")
    .map((e) => toEntry(e.ticker, e.kind, e.summary, e.at));

  const alertHistory: HistoryEntry[] = [
    ...(context?.alertHistory ?? []).map((a) =>
      toEntry(a.ticker, "alert", a.title, a.at)
    ),
    ...timeline.entries
      .filter((e) => e.kind === "alert_triggered")
      .map((e) => toEntry(e.ticker, e.kind, e.summary, e.at)),
  ];

  const researchHistory: HistoryEntry[] = [
    ...timeline.entries
      .filter((e) => e.kind === "research_updated")
      .map((e) => toEntry(e.ticker, e.kind, e.summary, e.at)),
    ...research.links.map((link) =>
      toEntry(
        link.ticker,
        "research",
        link.summary,
        context?.now?.toISOString() ?? new Date().toISOString()
      )
    ),
  ];

  const all = [
    ...addedTimeline,
    ...removedTimeline,
    ...performanceHistory,
    ...aiRecommendationHistory,
    ...alertHistory,
    ...researchHistory,
  ];

  if (all.length === 0) {
    return {
      watchlistId,
      addedTimeline: [],
      removedTimeline: [],
      performanceHistory: [],
      aiRecommendationHistory: [],
      alertHistory: [],
      researchHistory: [],
      empty: true,
      emptyMessage: WATCHLIST_ANALYTICS_EMPTY.awaitingHistory,
    };
  }

  return {
    watchlistId,
    addedTimeline,
    removedTimeline,
    performanceHistory,
    aiRecommendationHistory,
    alertHistory,
    researchHistory,
    empty: false,
    emptyMessage: WATCHLIST_ANALYTICS_EMPTY.awaitingHistory,
  };
}

export class WatchlistHistoryEngine {
  getWatchlistHistory = getWatchlistHistory;
}
