/**
 * Institutional dashboard layout registry — the single description of
 * what appears on the dashboard, where, in what order, and how large.
 * The page consumes this registry; it does not invent its own layout.
 *
 * Pure TypeScript (no React) so the information hierarchy is testable.
 */

import type { WidgetSize } from "../widgets/widgetSizes";

/** Vertical regions of the institutional dashboard, top to bottom. */
export type DashboardRegion = "snapshot" | "primary" | "rail" | "bottom";

export const DASHBOARD_REGIONS: readonly DashboardRegion[] = Object.freeze([
  "snapshot",
  "primary",
  "rail",
  "bottom",
]);

/** Visual priority — drives ordering inside a region. */
export type WidgetPriority = "high" | "medium" | "low";

export const PRIORITY_RANK: Readonly<Record<WidgetPriority, number>> = Object.freeze({
  high: 0,
  medium: 1,
  low: 2,
});

export interface WidgetLayout {
  id: string;
  title: string;
  region: DashboardRegion;
  size: WidgetSize;
  priority: WidgetPriority;
  /** Tie-breaker within the same priority. */
  order: number;
}

/**
 * The canonical dashboard widget set. Region + priority + order encode the
 * institutional hierarchy: conviction/AI/portfolio/watchlist first, then
 * calendar/research/alerts, utilities last.
 */
const WIDGET_LAYOUTS: readonly WidgetLayout[] = Object.freeze([
  // Market snapshot row — full-width market state.
  { id: "market-snapshot", title: "Market Snapshot", region: "snapshot", size: "xl", priority: "high", order: 0 },
  { id: "market-pulse", title: "Market Pulse", region: "snapshot", size: "xl", priority: "high", order: 1 },
  { id: "market-breadth", title: "Market Breadth", region: "snapshot", size: "xl", priority: "medium", order: 2 },

  // Primary work column (70%).
  { id: "executive-overview", title: "Executive Overview", region: "primary", size: "l", priority: "high", order: 0 },
  { id: "ai-opportunities", title: "AI Opportunities & Conviction", region: "primary", size: "l", priority: "high", order: 1 },
  { id: "portfolio-summary", title: "Portfolio Summary", region: "primary", size: "m", priority: "high", order: 2 },
  { id: "portfolio-health", title: "Portfolio Health", region: "primary", size: "m", priority: "high", order: 3 },

  // Context rail (30%).
  { id: "watchlist", title: "Watchlist", region: "rail", size: "s", priority: "high", order: 0 },
  { id: "ai-brief", title: "AI Market Brief", region: "rail", size: "s", priority: "medium", order: 1 },
  { id: "results-calendar", title: "Results Calendar", region: "rail", size: "s", priority: "medium", order: 2 },
  { id: "market-news", title: "Market Events", region: "rail", size: "s", priority: "medium", order: 3 },

  // Bottom band — history, timelines and secondary feeds.
  { id: "upcoming-earnings", title: "Earnings Intelligence", region: "bottom", size: "xl", priority: "medium", order: 0 },
]);

export interface DashboardLayout {
  regions: readonly DashboardRegion[];
  widgets: readonly WidgetLayout[];
  /** Widgets grouped per region, hierarchy-sorted. */
  byRegion: Readonly<Record<DashboardRegion, readonly WidgetLayout[]>>;
}

/** Sort by priority rank, then explicit order. */
export function sortByHierarchy(widgets: readonly WidgetLayout[]): WidgetLayout[] {
  return [...widgets].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
  );
}

/** Public API — the full institutional dashboard layout. */
export function getDashboardLayout(): DashboardLayout {
  const byRegion = Object.fromEntries(
    DASHBOARD_REGIONS.map((region) => [
      region,
      Object.freeze(sortByHierarchy(WIDGET_LAYOUTS.filter((w) => w.region === region))),
    ]),
  ) as Record<DashboardRegion, readonly WidgetLayout[]>;
  return Object.freeze({
    regions: DASHBOARD_REGIONS,
    widgets: WIDGET_LAYOUTS,
    byRegion: Object.freeze(byRegion),
  });
}

/** Public API — layout entry for a single widget, or null when unknown. */
export function getWidgetLayout(widgetId: string): WidgetLayout | null {
  return WIDGET_LAYOUTS.find((widget) => widget.id === widgetId) ?? null;
}
