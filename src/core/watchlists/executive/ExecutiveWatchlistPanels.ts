/**
 * Executive Watchlist Panels — composes R3/R4 intelligence (Sprint 10B.R8).
 */

import {
  getWatchlistChanges,
  getWatchlistOpportunities,
  getWatchlistSummary,
} from "../intelligence";
import { getWatchlistAlerts } from "../workspace";
import { getWatchlistResearch } from "../workspace";
import { getWatchlistEngine } from "../WatchlistEngine";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  emptyExecutivePanels,
  formatExecutiveScore,
  safeExecutiveText,
  type ExecutiveRankedItem,
  type ExecutiveWatchlistComposeInput,
  type ExecutiveWatchlistPanelsView,
} from "./ExecutiveWatchlistModels";

function rank(
  key: string,
  label: string,
  score: number,
  detail: string
): ExecutiveRankedItem {
  return {
    key,
    label: safeExecutiveText(label, key),
    score,
    scoreLabel: formatExecutiveScore(score),
    detail: safeExecutiveText(detail, label),
  };
}

export class ExecutiveWatchlistPanels {
  build(input?: ExecutiveWatchlistComposeInput | null): ExecutiveWatchlistPanelsView {
    const active = getWatchlistEngine().getActiveWatchlist();
    if (!active || !active.symbols.length) {
      return emptyExecutivePanels(EXECUTIVE_WATCHLIST_EMPTY.awaitingWorkspace);
    }

    const ctx = {
      watchlistId: active.id,
      symbols: active.symbols,
      snapshots: input?.snapshots,
      now: input?.now,
    };

    const opportunities = getWatchlistOpportunities(ctx);
    const summary = getWatchlistSummary(ctx);
    const changes = getWatchlistChanges(ctx);
    const alerts = getWatchlistAlerts(ctx);
    const research = getWatchlistResearch(ctx);

    const topOpportunities = opportunities.items.slice(0, 5).map((o) =>
      rank(o.ticker, o.title, o.priority, o.reason)
    );

    const highestConviction = summary.highestConviction
      ? [rank(summary.highestConviction.ticker, "Highest Conviction", 90, summary.highestConviction.value)]
      : [];

    const highestRisk = summary.highestRisk
      ? [rank(summary.highestRisk.ticker, "Highest Risk", 85, summary.highestRisk.value)]
      : [];

    const upcomingEarnings = opportunities.items
      .filter((o) => o.kind === "upcoming_earnings")
      .slice(0, 5)
      .map((o) => rank(o.ticker, o.title, o.priority, o.reason));

    const recentAiChanges = changes.items
      .filter((c) => c.kind === "conviction_change" || c.kind === "alert_history")
      .slice(0, 5)
      .map((c) => rank(c.ticker, c.kind, 70, c.summary));

    const researchActivity = research.links.slice(0, 5).map((l) =>
      rank(l.ticker, "Research", 60, l.summary)
    );

    const alertActivity = [
      ...alerts.existing.slice(0, 3),
      ...alerts.pinned.slice(0, 2),
    ].map((a) => rank(a.id, a.title, 75, a.summary));

    const empty =
      topOpportunities.length === 0 &&
      highestConviction.length === 0 &&
      alertActivity.length === 0;

    if (empty) {
      return emptyExecutivePanels();
    }

    return {
      topOpportunities,
      highestConviction,
      highestRisk,
      upcomingEarnings,
      recentAiChanges,
      researchActivity,
      alertActivity,
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.awaitingWorkspace,
    };
  }
}

export function getExecutiveWatchlistPanels(
  input?: ExecutiveWatchlistComposeInput | null
): ExecutiveWatchlistPanelsView {
  return new ExecutiveWatchlistPanels().build(input);
}
