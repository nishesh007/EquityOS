/**
 * Watchlist Intelligence Recommendation Engine (Sprint 10B.R3).
 * Action-oriented recommendations composing R2 signals.
 */

import { generateWatchlistAlerts } from "@/src/core/alerts/intelligence";
import {
  WATCHLIST_INTELLIGENCE_EMPTY,
  emptyIntelligenceRecommendationsView,
  safeIntelNumber,
  safeIntelText,
  type IntelligenceRecommendationAction,
  type IntelligenceRecommendationItem,
  type IntelligenceRecommendationsView,
  type WatchlistIntelligenceContext,
} from "./WatchlistPresentationModels";
import { getWatchlistOpportunities } from "./WatchlistOpportunityEngine";

function item(
  ticker: string,
  action: IntelligenceRecommendationAction,
  reason: string,
  priority: number
): IntelligenceRecommendationItem {
  return {
    ticker: ticker.toUpperCase(),
    action,
    reason: safeIntelText(reason, action),
    priority: safeIntelNumber(priority, 0),
  };
}

export function getWatchlistRecommendations(
  context?: WatchlistIntelligenceContext | null
): IntelligenceRecommendationsView {
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  if (!symbols.length) {
    return emptyIntelligenceRecommendationsView();
  }

  const snapshots = context?.snapshots ?? {};
  const portfolioSet = new Set(
    (context?.portfolioSymbols ?? []).map((s) => s.toUpperCase())
  );
  const opportunities = getWatchlistOpportunities(context);
  const alertBatch = generateWatchlistAlerts({
    items: symbols.map((s) => snapshots[s]).filter(Boolean),
    now: context?.now ?? undefined,
  });

  const items: IntelligenceRecommendationItem[] = [];

  for (const opp of opportunities.items) {
    switch (opp.kind) {
      case "high_conviction_addition":
      case "new_buy_zone":
        items.push(item(opp.ticker, "add", opp.reason, opp.priority));
        break;
      case "remove_candidate":
        items.push(item(opp.ticker, "remove", opp.reason, opp.priority));
        break;
      case "breakout":
      case "trend_reversal":
      case "upcoming_earnings":
        items.push(item(opp.ticker, "monitor", opp.reason, opp.priority));
        break;
      case "oversold":
        items.push(item(opp.ticker, "research_now", opp.reason, opp.priority));
        break;
      default:
        items.push(item(opp.ticker, "monitor", opp.reason, opp.priority));
    }
  }

  for (const symbol of symbols) {
    const snap = snapshots[symbol];
    if (!snap) continue;
    const conviction = safeIntelNumber(snap.convictionScore, 0);
    const inPortfolio = portfolioSet.has(symbol);

    if (inPortfolio && conviction >= 80) {
      items.push(
        item(
          symbol,
          "increase_allocation",
          "High conviction holding — consider increasing weight",
          conviction
        )
      );
    }
    if (inPortfolio && conviction < 45) {
      items.push(
        item(
          symbol,
          "reduce_allocation",
          "Weak conviction — consider reducing exposure",
          100 - conviction
        )
      );
    }
    if (conviction < 30) {
      items.push(
        item(symbol, "ignore", "Low priority — deprioritize monitoring", 20)
      );
    }
  }

  if (alertBatch.total > 0 && items.length === 0) {
    for (const alert of alertBatch.alerts.slice(0, 3)) {
      items.push(
        item(
          alert.ticker,
          "monitor",
          safeIntelText(alert.summary, "Active alert"),
          50
        )
      );
    }
  }

  if (items.length === 0) {
    return emptyIntelligenceRecommendationsView();
  }

  const deduped = new Map<string, IntelligenceRecommendationItem>();
  for (const rec of items.sort((a, b) => b.priority - a.priority)) {
    const key = `${rec.ticker}:${rec.action}`;
    if (!deduped.has(key)) deduped.set(key, rec);
  }

  return {
    items: Array.from(deduped.values()),
    empty: false,
    emptyMessage: WATCHLIST_INTELLIGENCE_EMPTY.awaitingAnalysis,
  };
}

export class WatchlistIntelligenceRecommendationEngine {
  getWatchlistRecommendations = getWatchlistRecommendations;
}
