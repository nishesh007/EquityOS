/**
 * Watchlist Decision Assistant (Sprint 10B.R6).
 * Composes R3 recommendations + R4 actions; no duplicated scoring.
 */

import { getWatchlistRecommendations } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import type { IntelligenceRecommendationAction } from "../intelligence";
import { getWatchlistActions } from "../workspace";
import {
  WATCHLIST_COPILOT_EMPTY,
  emptyDecisionView,
  safeCopilotNumber,
  safeCopilotText,
  type DecisionAssistantView,
  type DecisionItem,
  type DecisionKind,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

const DECISION_LABELS: Record<DecisionKind, string> = {
  buy: "Should I buy?",
  wait: "Should I wait?",
  remove: "Should I remove?",
  increase: "Should I increase?",
  reduce: "Should I reduce?",
  research: "Should I research?",
};

function mapAction(action: IntelligenceRecommendationAction): DecisionKind {
  switch (action) {
    case "add":
      return "buy";
    case "remove":
      return "remove";
    case "increase_allocation":
      return "increase";
    case "reduce_allocation":
      return "reduce";
    case "research_now":
      return "research";
    default:
      return "wait";
  }
}

function mapWorkspaceAction(action: string): DecisionKind | null {
  switch (action) {
    case "buy_candidate":
      return "buy";
    case "exit":
    case "remove":
      return "remove";
    case "reduce":
      return "reduce";
    case "move_to_portfolio":
      return "increase";
    case "monitor":
      return "wait";
    default:
      return null;
  }
}

function decision(
  ticker: string,
  kind: DecisionKind,
  reason: string,
  confidence: number
): DecisionItem {
  return {
    ticker: ticker.toUpperCase(),
    decision: kind,
    label: DECISION_LABELS[kind],
    reason: safeCopilotText(reason, kind),
    confidence: safeCopilotNumber(confidence, 50),
  };
}

export function getDecisionAssistant(
  context?: WatchlistCopilotContext | null
): DecisionAssistantView {
  const watchlistId = safeCopilotText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyDecisionView();
  }

  const recs = getWatchlistRecommendations(context as WatchlistIntelligenceContext);
  const actions = getWatchlistActions(context);
  const items: DecisionItem[] = [];

  for (const rec of recs.items.slice(0, 6)) {
    items.push(
      decision(rec.ticker, mapAction(rec.action), rec.reason, rec.priority)
    );
  }

  for (const act of actions.actions.slice(0, 4)) {
    if (!act.ticker) continue;
    const kind = mapWorkspaceAction(act.action);
    if (!kind) continue;
    items.push(decision(act.ticker, kind, act.reason, act.priority));
  }

  if (items.length === 0) {
    return emptyDecisionView();
  }

  const deduped = new Map<string, DecisionItem>();
  for (const item of items.sort((a, b) => b.confidence - a.confidence)) {
    const key = `${item.ticker}:${item.decision}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return {
    watchlistId,
    decisions: Array.from(deduped.values()),
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.noSuggestions,
  };
}

export class WatchlistDecisionAssistant {
  getDecisionAssistant = getDecisionAssistant;
}
