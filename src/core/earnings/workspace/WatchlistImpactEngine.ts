/**
 * Watchlist impact — exposure and conviction signals for watchlisted earnings.
 */

import { getEarningsCalendarService } from "@/src/core/earnings/calendar";
import { getEarningsDashboardEngine } from "@/src/core/earnings/dashboard";
import type {
  WatchlistImpactRow,
  WatchlistImpactView,
  WorkspaceContext,
} from "./WorkspaceModels";
import { WORKSPACE_EMPTY } from "./WorkspaceModels";

export class WatchlistImpactEngine {
  private readonly cache = new Map<string, WatchlistImpactView>();

  clearCache(): void {
    this.cache.clear();
  }

  getWatchlistImpact(
    context: WorkspaceContext = {},
    now = new Date()
  ): WatchlistImpactView {
    const symbols = (context.watchlistSymbols ?? []).map((s) =>
      s.toUpperCase()
    );
    const cacheKey = `${now.toISOString().slice(0, 10)}::${symbols.sort().join(",")}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const calendar = getEarningsCalendarService();
    const events = calendar.getWatchlistEarnings({ now });
    const dashboard = getEarningsDashboardEngine();
    dashboard.precomputeVisible(events, now);

    const rows: WatchlistImpactRow[] = events.map((event) => {
      const scorecard = dashboard.scoreEvent(event, now).scorecard;
      const highRisk = scorecard.riskScore >= 70 || scorecard.expectedVolatilityScore >= 70;
      return {
        ticker: event.ticker,
        companyName: event.companyName,
        watchlistExposure: String(scorecard.watchlistImpact || "—"),
        highConviction:
          event.highConviction || scorecard.aiConfidence >= 70,
        highRisk,
        transcriptAvailable: scorecard.transcriptAvailable,
        resultsPublished: scorecard.resultsReleased,
        aiConfidence: scorecard.available
          ? String(scorecard.aiConfidence)
          : "—",
        event,
        scorecard,
      };
    });

    const highConvictionCount = rows.filter((r) => r.highConviction).length;
    const highRiskCount = rows.filter((r) => r.highRisk).length;
    const exposureSummary =
      rows.length === 0
        ? "—"
        : String(
            Math.round(
              rows.reduce(
                (s, r) => s + (Number(r.watchlistExposure) || 0),
                0
              ) / rows.length
            )
          );

    const empty = rows.length === 0;
    const view: WatchlistImpactView = {
      rows,
      exposureSummary,
      highConvictionCount,
      highRiskCount,
      empty,
      emptyMessage: empty ? WORKSPACE_EMPTY.noWatchlist : "",
    };
    this.cache.set(cacheKey, view);
    return view;
  }
}

let singleton: WatchlistImpactEngine | null = null;

export function getWatchlistImpactEngine(): WatchlistImpactEngine {
  if (!singleton) singleton = new WatchlistImpactEngine();
  return singleton;
}

export function resetWatchlistImpactEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API */
export function getWatchlistImpact(
  context: WorkspaceContext = {},
  now = new Date()
): WatchlistImpactView {
  return getWatchlistImpactEngine().getWatchlistImpact(context, now);
}
