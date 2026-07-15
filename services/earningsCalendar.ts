/**
 * Server-facing façade for Institutional Earnings Calendar (Sprint 9B.R1).
 */

import {
  getEarningsCalendarService,
  resetEarningsCalendarService,
  type CalendarQueryOptions,
  type DashboardEarningsView,
  type EarningsCalendarEvent,
  type EarningsCalendarMetrics,
  type EarningsProximityInfo,
  type PortfolioEarningsRow,
  type ResultsPageCalendarView,
  type WatchlistEarningsSurface,
} from "@/src/core/earnings/calendar";
import {
  getDashboard,
  resetEarningsDashboardEngine,
  type EarningsDashboardQuery,
  type EarningsDashboardViewModel,
} from "@/src/core/earnings/dashboard";
import {
  getPortfolioAlerts,
  getUpcomingAlerts,
  getWatchlistAlerts,
  resetEarningsAlertEngine,
  resetAlertHistoryStore,
  resetEarningsNotificationCenter,
  type EarningsAlert,
} from "@/src/core/earnings/alerts";
import {
  getWorkspace,
  resetEarningsWorkspaceEngine,
  resetPortfolioImpactEngine,
  resetWatchlistImpactEngine,
  type HoldingWeightInput,
  type WorkspaceContext,
} from "@/src/core/earnings/workspace";
import {
  fetchPortfolioSummary,
  fetchWatchlist,
} from "@/services/marketData";
import type { UpcomingResult } from "@/types";

async function withMembership() {
  const service = getEarningsCalendarService();
  const [portfolio, watchlist] = await Promise.all([
    fetchPortfolioSummary(),
    fetchWatchlist(),
  ]);
  service.setMembership({
    portfolioSymbols: portfolio.holdings.map((h) => h.symbol),
    watchlistSymbols: watchlist.map((w) => w.symbol),
  });
  service.setUniverseSize(50);
  return service;
}

export async function fetchEarningsCalendarDashboard(
  now = new Date()
): Promise<DashboardEarningsView> {
  const service = await withMembership();
  return service.getDashboardView(now);
}

/** Institutional ranked/filtered earnings dashboard (Sprint 9B.R5). */
export async function fetchEarningsDashboard(
  query: EarningsDashboardQuery = {}
): Promise<EarningsDashboardViewModel> {
  await withMembership();
  return getDashboard(query);
}

export async function fetchEarningsCalendarResultsPage(
  options: CalendarQueryOptions = {}
): Promise<ResultsPageCalendarView> {
  const service = await withMembership();
  return service.getResultsPageView(options);
}

export async function fetchUpcomingEarningsEvents(
  options: CalendarQueryOptions = {}
): Promise<EarningsCalendarEvent[]> {
  const service = await withMembership();
  return service.getUpcomingEarnings(options);
}

export async function fetchTodayEarningsEvents(): Promise<EarningsCalendarEvent[]> {
  const service = await withMembership();
  return service.getTodayEarnings();
}

export async function fetchPortfolioEarningsEvents(): Promise<
  EarningsCalendarEvent[]
> {
  const service = await withMembership();
  return service.getPortfolioEarnings();
}

export async function fetchWatchlistEarningsEvents(): Promise<
  EarningsCalendarEvent[]
> {
  const service = await withMembership();
  return service.getWatchlistEarnings();
}

export async function fetchWatchlistEarningsSurface(): Promise<WatchlistEarningsSurface> {
  const service = await withMembership();
  return service.getWatchlistSurface();
}

export async function fetchPortfolioEarningsRows(): Promise<PortfolioEarningsRow[]> {
  const service = await withMembership();
  return service.getPortfolioRows();
}

export async function fetchCalendarMetrics(): Promise<EarningsCalendarMetrics> {
  const service = await withMembership();
  return service.getCalendarMetrics();
}

export async function fetchEarningsProximity(
  symbol: string
): Promise<EarningsProximityInfo> {
  const service = await withMembership();
  return service.getEarningsProximity(symbol);
}

/** Drop-in replacement for legacy static upcoming list. */
export async function fetchUpcomingResultsFromCalendar(): Promise<
  UpcomingResult[]
> {
  const service = await withMembership();
  return service.toUpcomingResults();
}

/** Institutional earnings alerts (Sprint 9B.R6). */
export async function fetchUpcomingEarningsAlerts(): Promise<EarningsAlert[]> {
  await withMembership();
  return getUpcomingAlerts();
}

export async function fetchPortfolioEarningsAlerts(): Promise<EarningsAlert[]> {
  await withMembership();
  return getPortfolioAlerts();
}

export async function fetchWatchlistEarningsAlerts(): Promise<EarningsAlert[]> {
  await withMembership();
  return getWatchlistAlerts();
}

/** Institutional earnings workspace context (Sprint 9B.R7). */
export async function fetchEarningsWorkspaceContext(): Promise<WorkspaceContext> {
  const [portfolio, watchlist] = await Promise.all([
    fetchPortfolioSummary(),
    fetchWatchlist(),
  ]);
  await withMembership();
  const holdings: HoldingWeightInput[] = portfolio.holdings.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    quantity: h.quantity,
    currentPrice: h.currentPrice,
  }));
  return {
    holdings,
    totalValue: portfolio.totalValue,
    watchlistSymbols: watchlist.map((w) => w.symbol),
    portfolioSymbols: portfolio.holdings.map((h) => h.symbol),
  };
}

export async function fetchEarningsWorkspace() {
  const context = await fetchEarningsWorkspaceContext();
  return getWorkspace({ context, includeReport: false });
}

export function resetEarningsCalendarForTests(): void {
  resetEarningsCalendarService();
  resetEarningsDashboardEngine();
  resetEarningsAlertEngine();
  resetAlertHistoryStore();
  resetEarningsNotificationCenter();
  resetEarningsWorkspaceEngine();
  resetPortfolioImpactEngine();
  resetWatchlistImpactEngine();
}
