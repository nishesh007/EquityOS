/**
 * Institutional Earnings Dashboard orchestrator — ranks / filters / caches scorecards.
 */

import {
  getEarningsCalendarService,
  type EarningsCalendarEvent,
} from "@/src/core/earnings/calendar";
import { getEarningsPreviewEngine } from "@/src/core/earnings/intelligence";
import { buildEarningsScorecard } from "./EarningsImpactScore";
import { filterEarnings } from "./EarningsFilterEngine";
import { applyPriorityBoost, isHighConvictionItem } from "./EarningsPriorityEngine";
import { getRankedEarnings, sortEarnings } from "./EarningsRankingEngine";
import {
  buildDashboardMetrics,
  presentDashboardPage,
} from "./EarningsDashboardPresenter";
import type {
  DashboardSortKey,
  EarningsDashboardQuery,
  EarningsDashboardViewModel,
  RankedEarningsItem,
} from "./EarningsDashboardModels";
import { DASHBOARD_EMPTY } from "./EarningsDashboardModels";

function scoreKey(event: EarningsCalendarEvent): string {
  return `${event.ticker}::${event.resultDate}`;
}

export class EarningsDashboardEngine {
  private readonly scoreCache = new Map<string, RankedEarningsItem>();

  clearCache(): void {
    this.scoreCache.clear();
  }

  scoreEvent(event: EarningsCalendarEvent, now = new Date()): RankedEarningsItem {
    const key = scoreKey(event);
    const cached = this.scoreCache.get(key);
    if (cached) {
      return { ...cached, event };
    }
    const scorecard = buildEarningsScorecard(event, now);
    const item: RankedEarningsItem = { event, scorecard, rank: 0 };
    this.scoreCache.set(key, item);
    return item;
  }

  /** Incrementally score only the provided (visible/candidate) events. */
  precomputeVisible(events: readonly EarningsCalendarEvent[], now = new Date()): void {
    getEarningsPreviewEngine().precomputeVisible([...events]);
    for (const event of events) {
      this.scoreEvent(event, now);
    }
  }

  scoreAll(
    events: readonly EarningsCalendarEvent[],
    now = new Date()
  ): RankedEarningsItem[] {
    this.precomputeVisible(events, now);
    const scored = events.map((event) => this.scoreEvent(event, now));
    return applyPriorityBoost(scored, now);
  }

  getDashboard(query: EarningsDashboardQuery = {}): EarningsDashboardViewModel {
    const now = query.now ?? new Date();
    const calendar = getEarningsCalendarService();
    const events = calendar.getUpcomingEarnings({ now });
    const scored = this.scoreAll(events, now);
    const filtered = filterEarnings(scored, query.filters ?? {}, now);
    const ranked = getRankedEarnings(
      filtered,
      query.sortBy ?? "institutional_rank"
    );
    const metrics = buildDashboardMetrics(events, scored, now);

    let emptyMessage: string = DASHBOARD_EMPTY.noMatchingFilters;
    if (events.length === 0) emptyMessage = DASHBOARD_EMPTY.noUpcoming;
    else if (query.filters?.smartFilters?.includes("portfolio") && filtered.length === 0) {
      emptyMessage = DASHBOARD_EMPTY.noPortfolio;
    } else if (
      query.filters?.smartFilters?.includes("watchlist") &&
      filtered.length === 0
    ) {
      emptyMessage = DASHBOARD_EMPTY.noWatchlist;
    }

    return presentDashboardPage({
      metrics,
      ranked,
      page: query.page,
      pageSize: query.pageSize,
      emptyMessage,
    });
  }
}

let singleton: EarningsDashboardEngine | null = null;

export function getEarningsDashboardEngine(): EarningsDashboardEngine {
  if (!singleton) singleton = new EarningsDashboardEngine();
  return singleton;
}

export function resetEarningsDashboardEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API — getDashboard() */
export function getDashboard(
  query: EarningsDashboardQuery = {}
): EarningsDashboardViewModel {
  return getEarningsDashboardEngine().getDashboard(query);
}

/** Public API — getRankedEarnings() */
export function getRankedEarningsPublic(
  sortBy: DashboardSortKey = "institutional_rank",
  now = new Date()
): RankedEarningsItem[] {
  const engine = getEarningsDashboardEngine();
  const events = getEarningsCalendarService().getUpcomingEarnings({ now });
  const scored = engine.scoreAll(events, now);
  return sortEarnings(scored, sortBy);
}

/** Public API — getHighConvictionEarnings() */
export function getHighConvictionEarnings(now = new Date()): RankedEarningsItem[] {
  return getRankedEarningsPublic("institutional_rank", now).filter(
    isHighConvictionItem
  );
}

/** Public API — getPortfolioEarnings() */
export function getPortfolioEarningsRanked(
  now = new Date()
): RankedEarningsItem[] {
  return getRankedEarningsPublic("institutional_rank", now).filter(
    (i) => i.event.inPortfolio
  );
}

/** Public API — getWatchlistEarnings() */
export function getWatchlistEarningsRanked(
  now = new Date()
): RankedEarningsItem[] {
  return getRankedEarningsPublic("institutional_rank", now).filter(
    (i) => i.event.inWatchlist
  );
}
