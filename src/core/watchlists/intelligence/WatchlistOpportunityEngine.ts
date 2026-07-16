/**
 * Watchlist Opportunity Engine — monitoring signals (Sprint 10B.R3).
 * Composes snapshots and opportunity maps from Sprint 9A/9C.
 */

import type {
  OpportunitySnapshot,
  WatchlistItemSnapshot,
} from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyOpportunitiesView,
  safeIntelNumber,
  safeIntelText,
  type OpportunityKind,
  type WatchlistIntelligenceContext,
  type WatchlistOpportunitiesView,
  type WatchlistOpportunityItem,
} from "./WatchlistPresentationModels";

function opp(
  ticker: string,
  kind: OpportunityKind,
  title: string,
  reason: string,
  priority: number
): WatchlistOpportunityItem {
  return {
    ticker: ticker.toUpperCase(),
    kind,
    title,
    reason: safeIntelText(reason, title),
    priority: safeIntelNumber(priority, 0),
  };
}

export function getWatchlistOpportunities(
  context?: WatchlistIntelligenceContext | null
): WatchlistOpportunitiesView {
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  if (!symbols.length) {
    return emptyOpportunitiesView();
  }

  const snapshots = context?.snapshots ?? {};
  const opportunities = context?.opportunities ?? {};
  const metrics = context?.metricsBySymbol ?? {};
  const items: WatchlistOpportunityItem[] = [];

  for (const ticker of symbols) {
    const snap = snapshots[ticker];
    if (!snap) continue;
    const m = metrics[ticker] ?? {};

    if (
      snap.entryLow != null &&
      snap.entryHigh != null &&
      snap.price >= snap.entryLow &&
      snap.price <= snap.entryHigh
    ) {
      items.push(
        opp(
          ticker,
          "new_buy_zone",
          "New Buy Zone",
          `Price ${snap.price} inside entry zone`,
          80
        )
      );
    }

    const momentum = safeIntelNumber(
      (m.momentum as number | null) ?? snap.convictionScore,
      0
    );
    const volumeRatio = safeIntelNumber(snap.volumeRatio, 0);
    if (momentum >= 70 && volumeRatio >= 1.5) {
      items.push(
        opp(
          ticker,
          "breakout",
          "Breakout",
          "Momentum and volume confirm breakout",
          75
        )
      );
    }

    const prior = context?.priorSnapshots?.[ticker];
    if (
      prior &&
      prior.changePercent < 0 &&
      snap.changePercent > 0 &&
      momentum >= 50
    ) {
      items.push(
        opp(
          ticker,
          "trend_reversal",
          "Trend Reversal",
          "Price action reversed from prior session",
          70
        )
      );
    }

    const rsi = safeIntelNumber(m.rsi as number | null, NaN);
    if (Number.isFinite(rsi) && rsi <= 30 && snap.changePercent > 0) {
      items.push(
        opp(
          ticker,
          "oversold",
          "Oversold",
          `RSI ${rsi} with positive price action`,
          65
        )
      );
    }

    const daysToEarnings = safeIntelNumber(m.days_to_earnings as number | null, NaN);
    if (Number.isFinite(daysToEarnings) && daysToEarnings <= 14) {
      items.push(
        opp(
          ticker,
          "upcoming_earnings",
          "Upcoming Earnings",
          `Earnings in ${daysToEarnings} days`,
          72
        )
      );
    }

    if (m.corporate_action) {
      items.push(
        opp(
          ticker,
          "upcoming_corporate_action",
          "Corporate Action",
          safeIntelText(String(m.corporate_action), "Corporate action pending"),
          60
        )
      );
    }

    const oppSnap = opportunities[ticker] as OpportunitySnapshot | undefined;
    if (oppSnap && oppSnap.aiConvictionScore >= 75) {
      items.push(
        opp(
          ticker,
          "high_conviction_addition",
          "High Conviction Addition",
          safeIntelText(oppSnap.reason, "High conviction opportunity"),
          Math.round(oppSnap.aiConvictionScore)
        )
      );
    }

    const risk = 100 - safeIntelNumber(snap.trustScore, 50);
    if (safeIntelNumber(snap.convictionScore, 0) < 40 && risk > 60) {
      items.push(
        opp(
          ticker,
          "remove_candidate",
          "Remove Candidate",
          "Low conviction with elevated risk",
          55
        )
      );
    }
  }

  if (items.length === 0) {
    return emptyOpportunitiesView();
  }

  return {
    items: items.sort((a, b) => b.priority - a.priority),
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

export class WatchlistOpportunityEngine {
  getWatchlistOpportunities = getWatchlistOpportunities;
}
