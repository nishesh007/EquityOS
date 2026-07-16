/**
 * Watchlist Comparison Engine (Sprint 10B.R6).
 * Compare companies and watchlists using existing snapshot bags.
 */

import { getWatchlistOpportunities } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import {
  WATCHLIST_COPILOT_EMPTY,
  emptyCompanyComparison,
  emptyWatchlistComparison,
  safeCopilotNumber,
  safeCopilotText,
  type CompanyComparisonView,
  type ComparisonRow,
  type WatchlistComparisonView,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

function row(label: string, values: Record<string, string>): ComparisonRow {
  return { label, values };
}

export function compareCompanies(
  context?: WatchlistCopilotContext | null
): CompanyComparisonView {
  const tickers = (context?.compareTickers ?? context?.symbols ?? [])
    .map((s) => s.toUpperCase())
    .slice(0, 4);

  if (tickers.length < 2) {
    return emptyCompanyComparison();
  }

  const snapshots = context?.snapshots ?? {};
  const sectors = context?.sectorBySymbol ?? {};
  const opportunities = getWatchlistOpportunities(context as WatchlistIntelligenceContext);
  const oppSet = new Set(opportunities.items.map((o) => o.ticker));

  const conviction: Record<string, string> = {};
  const trust: Record<string, string> = {};
  const change: Record<string, string> = {};
  const sector: Record<string, string> = {};
  const opportunity: Record<string, string> = {};

  for (const ticker of tickers) {
    const snap = snapshots[ticker];
    conviction[ticker] = snap ? String(safeCopilotNumber(snap.convictionScore)) : "—";
    trust[ticker] = snap ? String(safeCopilotNumber(snap.trustScore)) : "—";
    change[ticker] = snap ? `${safeCopilotNumber(snap.changePercent)}%` : "—";
    sector[ticker] = safeCopilotText(sectors[ticker], "Other");
    opportunity[ticker] = oppSet.has(ticker) ? "Yes" : "No";
  }

  return {
    tickers,
    rows: [
      row("Conviction", conviction),
      row("Trust", trust),
      row("Change %", change),
      row("Sector", sector),
      row("Opportunity", opportunity),
    ],
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.noSuggestions,
  };
}

export function compareWatchlists(
  context?: WatchlistCopilotContext | null
): WatchlistComparisonView {
  const leftId = safeCopilotText(context?.watchlistId, "left");
  const rightId = safeCopilotText(context?.compareWatchlistId, "right");
  const leftSymbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  const rightSymbols = (context?.compareSymbols ?? []).map((s) => s.toUpperCase());

  if (!leftSymbols.length || !rightSymbols.length) {
    return emptyWatchlistComparison();
  }

  const leftSet = new Set(leftSymbols);
  const rightSet = new Set(rightSymbols);
  const overlap = leftSymbols.filter((s) => rightSet.has(s));
  const leftOnly = leftSymbols.filter((s) => !rightSet.has(s));
  const rightOnly = rightSymbols.filter((s) => !leftSet.has(s));

  const snapshots = context?.snapshots ?? {};
  const avgConviction = (symbols: string[]) => {
    let sum = 0;
    let n = 0;
    for (const s of symbols) {
      const v = snapshots[s]?.convictionScore;
      if (v == null) continue;
      sum += safeCopilotNumber(v);
      n += 1;
    }
    return n === 0 ? "—" : String(Math.round(sum / n));
  };

  return {
    leftId,
    rightId,
    rows: [
      row("Company Count", {
        [leftId]: String(leftSymbols.length),
        [rightId]: String(rightSymbols.length),
      }),
      row("Overlap", {
        [leftId]: String(overlap.length),
        [rightId]: String(overlap.length),
      }),
      row("Unique Ideas", {
        [leftId]: String(leftOnly.length),
        [rightId]: String(rightOnly.length),
      }),
      row("Avg Conviction", {
        [leftId]: avgConviction(leftSymbols),
        [rightId]: avgConviction(rightSymbols),
      }),
    ],
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.noSuggestions,
  };
}

export class WatchlistComparisonEngine {
  compareCompanies = compareCompanies;
  compareWatchlists = compareWatchlists;
}
