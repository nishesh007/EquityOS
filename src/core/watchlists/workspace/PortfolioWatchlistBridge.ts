/**
 * Portfolio Watchlist Bridge — overlap & allocation (Sprint 10B.R4).
 */

import { getWatchlistRecord } from "../WatchlistRegistry";
import { getWatchlistIntelligenceHealth } from "../intelligence";
import {
  WORKSPACE_EMPTY,
  emptyPortfolioBridge,
  safeWorkspaceText,
  type PortfolioBridgeView,
  type WatchlistWorkspaceContext,
} from "./WatchlistWorkspaceModels";
import { recordTimelineEvent } from "./WatchlistActivityTimeline";

const movedToPortfolio = new Set<string>();

export function getPortfolioBridge(
  context?: WatchlistWorkspaceContext | null
): PortfolioBridgeView {
  const watchlistId = safeWorkspaceText(context?.watchlistId, "");
  const record = watchlistId ? getWatchlistRecord(watchlistId) : null;
  const symbols = (context?.symbols ?? record?.symbols ?? []).map((s) =>
    s.toUpperCase()
  );
  const portfolio = (context?.portfolioSymbols ?? []).map((s) => s.toUpperCase());
  const weights = context?.portfolioWeights ?? {};
  const snapshots = context?.snapshots ?? {};

  if (!symbols.length) {
    return emptyPortfolioBridge();
  }

  const portfolioSet = new Set(portfolio);
  const watchSet = new Set(symbols);
  const overlap = symbols.filter((s) => portfolioSet.has(s));
  const overlapPercent =
    symbols.length === 0 ? 0 : Math.round((overlap.length / symbols.length) * 100);

  const missingHoldings = portfolio.filter((s) => !watchSet.has(s));
  const watchlistCandidates = symbols.filter((s) => !portfolioSet.has(s));

  const intel = getWatchlistIntelligenceHealth({
    watchlistId,
    symbols,
    snapshots,
    portfolioSymbols: portfolio,
    now: context?.now,
  });

  const upgradeCandidates = symbols.filter((s) => {
    const snap = snapshots[s];
    return (
      portfolioSet.has(s) &&
      snap &&
      (snap.convictionScore ?? 0) >= 75
    );
  });

  const exitCandidates = symbols.filter((s) => {
    const snap = snapshots[s];
    return (
      portfolioSet.has(s) &&
      snap &&
      (snap.convictionScore ?? 100) < 40
    );
  });

  const allocationImpact = watchlistCandidates.slice(0, 5).map((ticker) => {
    const currentWeight = weights[ticker] ?? 0;
    const projectedWeight = Math.min(100, currentWeight + 5);
    return { ticker, currentWeight, projectedWeight };
  });

  return {
    watchlistId: watchlistId || record?.id || "",
    overlap,
    overlapPercent,
    missingHoldings,
    watchlistCandidates,
    upgradeCandidates,
    exitCandidates,
    allocationImpact,
    empty: overlap.length === 0 && watchlistCandidates.length === 0,
    emptyMessage:
      overlap.length === 0 && watchlistCandidates.length === 0
        ? WORKSPACE_EMPTY.noPortfolioLinks
        : WORKSPACE_EMPTY.noPortfolioLinks,
  };
}

export function moveToPortfolio(input: {
  watchlistId: string;
  symbols: string[];
  portfolioSymbols?: string[];
  now?: Date | null;
}): { moved: string[]; portfolioSymbols: string[] } {
  const watchlistId = safeWorkspaceText(input.watchlistId, "").toLowerCase();
  const moved = input.symbols.map((s) => s.toUpperCase()).filter(Boolean);
  const existing = (input.portfolioSymbols ?? []).map((s) => s.toUpperCase());
  const next = Array.from(new Set([...existing, ...moved]));

  for (const ticker of moved) {
    movedToPortfolio.add(`${watchlistId}:${ticker}`);
    recordTimelineEvent({
      watchlistId,
      kind: "portfolio_moved",
      ticker,
      summary: `Moved ${ticker} to portfolio`,
      actor: "analyst",
      now: input.now,
    });
  }

  return { moved, portfolioSymbols: next };
}

export function wasMovedToPortfolio(watchlistId: string, ticker: string): boolean {
  return movedToPortfolio.has(
    `${safeWorkspaceText(watchlistId, "").toLowerCase()}:${ticker.toUpperCase()}`
  );
}

export function resetPortfolioBridge(): void {
  movedToPortfolio.clear();
}
