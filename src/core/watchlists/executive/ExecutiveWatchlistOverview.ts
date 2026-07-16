/**
 * Executive Watchlist Overview — dashboard summary cards (Sprint 10B.R8).
 */

import { getWatchlists } from "../WatchlistEngine";
import { getWatchlistCopilotHealth } from "../copilot";
import { getInstitutionalWorkspaceHealth } from "../workspace";
import { getPortfolioBridge } from "../workspace";
import { getWatchlistEngine } from "../WatchlistEngine";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  emptyExecutiveOverview,
  formatExecutivePct,
  formatExecutiveScore,
  safeExecutiveNumber,
  type ExecutiveSummaryCard,
  type ExecutiveWatchlistComposeInput,
  type ExecutiveWatchlistHealthView,
  type ExecutiveWatchlistOverviewView,
} from "./ExecutiveWatchlistModels";
import { ExecutiveWatchlistHealth } from "./ExecutiveWatchlistHealth";

function card(id: string, label: string, value: string, numeric: number): ExecutiveSummaryCard {
  return { id, label, value, numeric };
}

export class ExecutiveWatchlistOverview {
  build(
    input: ExecutiveWatchlistComposeInput | null | undefined,
    health: ExecutiveWatchlistHealthView
  ): ExecutiveWatchlistOverviewView {
    const all = getWatchlists({ includeArchived: true });
    const active = all.filter((r) => r.status === "active");
    if (!active.length) {
      return emptyExecutiveOverview(EXECUTIVE_WATCHLIST_EMPTY.noWatchlists);
    }

    const archived = all.filter((r) => r.status === "archived");
    const favorites = active.filter((r) => r.favorite);
    const pinned = active.filter((r) => r.pinned);
    const engineActive = getWatchlistEngine().getActiveWatchlist();

    const portfolio = getPortfolioBridge({
      watchlistId: engineActive?.id,
      symbols: engineActive?.symbols,
      snapshots: input?.snapshots,
      portfolioSymbols: input?.portfolioSymbols,
      now: input?.now,
    });
    const portfolioCoverage = portfolio.overlapPercent;

    const copilot = getWatchlistCopilotHealth({
      watchlistId: engineActive?.id,
      symbols: engineActive?.symbols,
      snapshots: input?.snapshots,
      now: input?.now,
    });
    const workspace = getInstitutionalWorkspaceHealth({
      watchlistId: engineActive?.id,
      symbols: engineActive?.symbols,
      snapshots: input?.snapshots,
      now: input?.now,
    });

    const aiHealth = copilot.ready
      ? Math.min(100, safeExecutiveNumber(copilot.decisionCount * 10, 50))
      : 0;
    const researchHealth = workspace.ready
      ? Math.min(100, safeExecutiveNumber(workspace.savedCount * 15, 40))
      : 0;

    const cards: ExecutiveSummaryCard[] = [
      card("total", "Total Watchlists", String(all.length), all.length),
      card("active", "Active Watchlists", String(active.length), active.length),
      card("favorites", "Favorites", String(favorites.length), favorites.length),
      card("archived", "Archived", String(archived.length), archived.length),
      card("pinned", "Pinned", String(pinned.length), pinned.length),
      card("ai_health", "AI Health", formatExecutiveScore(aiHealth), aiHealth),
      card("research_health", "Research Health", formatExecutiveScore(researchHealth), researchHealth),
      card("portfolio_coverage", "Portfolio Coverage", formatExecutivePct(portfolioCoverage), portfolioCoverage),
      card("overall_health", "Overall Health", health.overallHealthLabel, health.overallHealthScore),
    ];

    return {
      cards,
      totalWatchlists: all.length,
      activeWatchlists: active.length,
      favorites: favorites.length,
      archived: archived.length,
      pinned: pinned.length,
      aiHealth,
      researchHealth,
      portfolioCoverage,
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noWatchlists,
    };
  }
}

export function getExecutiveWatchlistOverview(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistOverviewView {
  const health = new ExecutiveWatchlistHealth().build(input);
  return new ExecutiveWatchlistOverview().build(input, health);
}
