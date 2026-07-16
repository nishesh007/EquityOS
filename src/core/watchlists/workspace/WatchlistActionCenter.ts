/**
 * Watchlist Action Center — actionable decisions (Sprint 10B.R4).
 */

import { getWatchlistRecord, pinWatchlistRecord, favoriteWatchlistRecord, archiveWatchlistRecord } from "../WatchlistRegistry";
import { getWatchlistRecommendations } from "../intelligence";
import { getPortfolioBridge } from "./PortfolioWatchlistBridge";
import {
  WORKSPACE_EMPTY,
  safeWorkspaceText,
  type ActionCenterActionId,
  type WatchlistActionItem,
  type WatchlistActionsView,
  type WatchlistWorkspaceContext,
} from "./WatchlistWorkspaceModels";
import { recordTimelineEvent } from "./WatchlistActivityTimeline";

let actionSeq = 0;

function action(
  ticker: string,
  actionId: ActionCenterActionId,
  reason: string,
  priority: number
): WatchlistActionItem {
  actionSeq += 1;
  const labels: Record<ActionCenterActionId, string> = {
    buy_candidate: "Buy Candidate",
    reduce: "Reduce",
    exit: "Exit",
    monitor: "Monitor",
    move_to_portfolio: "Move to Portfolio",
    remove: "Remove",
    pin: "Pin",
    favorite: "Favorite",
    archive: "Archive",
  };
  return {
    id: `act-${actionSeq}`,
    ticker: ticker.toUpperCase(),
    action: actionId,
    label: labels[actionId],
    reason: safeWorkspaceText(reason, labels[actionId]),
    priority,
  };
}

export function getWatchlistActions(
  context?: WatchlistWorkspaceContext | null
): WatchlistActionsView {
  const watchlistId = safeWorkspaceText(context?.watchlistId, "");
  const record = watchlistId ? getWatchlistRecord(watchlistId) : null;
  const symbols = context?.symbols ?? record?.symbols ?? [];

  if (!symbols.length) {
    return {
      actions: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noActivity,
    };
  }

  const portfolio = getPortfolioBridge(context);
  const recs = getWatchlistRecommendations({
    symbols,
    snapshots: context?.snapshots,
    portfolioSymbols: context?.portfolioSymbols,
    now: context?.now,
  });

  const items: WatchlistActionItem[] = [];

  for (const ticker of portfolio.watchlistCandidates.slice(0, 3)) {
    items.push(action(ticker, "buy_candidate", "Strong watchlist candidate not in portfolio", 80));
    items.push(action(ticker, "move_to_portfolio", "Consider moving to portfolio", 75));
  }

  for (const ticker of portfolio.exitCandidates) {
    items.push(action(ticker, "exit", "Low conviction holding", 70));
    items.push(action(ticker, "reduce", "Reduce allocation", 65));
  }

  for (const ticker of portfolio.upgradeCandidates) {
    items.push(action(ticker, "monitor", "High conviction — monitor for add", 60));
  }

  for (const rec of recs.items.slice(0, 5)) {
    const mapped: ActionCenterActionId =
      rec.action === "add"
        ? "buy_candidate"
        : rec.action === "remove"
          ? "remove"
          : rec.action === "reduce_allocation"
            ? "reduce"
            : "monitor";
    items.push(action(rec.ticker, mapped, rec.reason, rec.priority));
  }

  if (record && !record.pinned) {
    items.push(action("", "pin", `Pin watchlist ${record.metadata.name}`, 40));
  }
  if (record && !record.favorite) {
    items.push(action("", "favorite", `Favorite watchlist ${record.metadata.name}`, 35));
  }

  if (items.length === 0) {
    return {
      actions: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noActivity,
    };
  }

  const deduped = new Map<string, WatchlistActionItem>();
  for (const item of items.sort((a, b) => b.priority - a.priority)) {
    const key = `${item.ticker}:${item.action}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return {
    actions: Array.from(deduped.values()),
    empty: false,
    emptyMessage: WORKSPACE_EMPTY.noActivity,
  };
}

export function executeWatchlistAction(input: {
  watchlistId: string;
  action: ActionCenterActionId;
  ticker?: string | null;
  now?: Date | null;
}): boolean {
  const id = safeWorkspaceText(input.watchlistId, "").toLowerCase();
  if (!id) return false;

  switch (input.action) {
    case "pin":
      pinWatchlistRecord(id, true, input.now);
      break;
    case "favorite":
      favoriteWatchlistRecord(id, true, input.now);
      break;
    case "archive":
      archiveWatchlistRecord(id, input.now);
      break;
    case "remove":
      recordTimelineEvent({
        watchlistId: id,
        kind: "removed",
        ticker: input.ticker,
        summary: `Removed ${input.ticker ?? "symbol"} from watchlist`,
        now: input.now,
      });
      break;
    case "move_to_portfolio":
      recordTimelineEvent({
        watchlistId: id,
        kind: "portfolio_moved",
        ticker: input.ticker,
        summary: `Move ${input.ticker ?? "symbol"} to portfolio`,
        now: input.now,
      });
      break;
    default:
      recordTimelineEvent({
        watchlistId: id,
        kind: "ai_recommendation",
        ticker: input.ticker,
        summary: `Action: ${input.action}`,
        now: input.now,
      });
  }
  return true;
}
