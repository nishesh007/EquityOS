/**
 * Sprint 10C.R6 / 10C.1 — built-in dashboard layout templates.
 *
 * A template is a named arrangement of registered widgets: region, order,
 * size and visibility. Applying a template replaces the active workspace's
 * placements — it never touches data or business logic.
 */

import type { WorkspaceRegion, WorkspaceSize } from "../widgets/widgetRegistry";

export interface WidgetPlacement {
  widgetId: string;
  region: WorkspaceRegion;
  order: number;
  size: WorkspaceSize;
  visible: boolean;
  pinned: boolean;
  collapsed: boolean;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  placements: readonly WidgetPlacement[];
}

function place(
  widgetId: string,
  region: WorkspaceRegion,
  order: number,
  size: WorkspaceSize,
  overrides: Partial<WidgetPlacement> = {}
): WidgetPlacement {
  return {
    widgetId,
    region,
    order,
    size,
    visible: true,
    pinned: false,
    collapsed: false,
    ...overrides,
  };
}

/** Default institutional terminal — full hierarchy. */
const institutional: DashboardTemplate = {
  id: "institutional",
  name: "Default",
  description: "Full terminal: markets, internals, heatmap, AI and portfolio",
  placements: [
    place("market-snapshot", "snapshot", 0, "full", { pinned: true }),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-heatmap", "snapshot", 2, "full"),
    place("market-breadth", "snapshot", 3, "full"),
    place("market-movers", "snapshot", 4, "large"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("portfolio-summary", "main", 1, "large"),
    place("watchlist", "main", 2, "small"),
    place("ai-alerts", "main", 3, "medium"),
    place("research-summary", "main", 4, "medium"),
    place("results-calendar", "main", 5, "small"),
    place("economic-calendar", "main", 6, "medium", { visible: false }),
    place("market-news", "main", 7, "small"),
    place("portfolio-health", "main", 8, "large", { visible: false }),
    place("ai-brief", "main", 9, "small", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const research: DashboardTemplate = {
  id: "research",
  name: "Research",
  description: "AI ideas, research summary and news first — portfolio minimized",
  placements: [
    place("market-snapshot", "snapshot", 0, "full"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("research-summary", "main", 1, "medium", { pinned: true }),
    place("ai-brief", "main", 2, "medium"),
    place("market-news", "main", 3, "medium"),
    place("results-calendar", "main", 4, "medium"),
    place("watchlist", "main", 5, "medium"),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-heatmap", "snapshot", 2, "full", { visible: false }),
    place("market-breadth", "snapshot", 3, "full", { visible: false }),
    place("market-movers", "snapshot", 4, "large", { visible: false }),
    place("portfolio-summary", "main", 6, "large", { visible: false }),
    place("portfolio-health", "main", 7, "large", { visible: false }),
    place("ai-alerts", "main", 8, "medium"),
    place("economic-calendar", "main", 9, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const portfolio: DashboardTemplate = {
  id: "portfolio",
  name: "Portfolio Monitoring",
  description: "Holdings, health and allocation front and center",
  placements: [
    place("portfolio-summary", "main", 0, "full", { pinned: true }),
    place("portfolio-health", "main", 1, "full"),
    place("watchlist", "main", 2, "medium"),
    place("ai-opportunities", "main", 3, "full"),
    place("ai-alerts", "main", 4, "medium"),
    place("market-snapshot", "snapshot", 0, "full"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("market-heatmap", "snapshot", 3, "full", { visible: false }),
    place("market-movers", "snapshot", 4, "large", { visible: false }),
    place("research-summary", "main", 5, "medium"),
    place("results-calendar", "main", 6, "medium"),
    place("economic-calendar", "main", 7, "medium", { visible: false }),
    place("market-news", "main", 8, "medium", { visible: false }),
    place("ai-brief", "main", 9, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const swingTrader: DashboardTemplate = {
  id: "swing-trader",
  name: "Swing Trading",
  description: "Market internals, heatmap and AI setups for 1–4 week trades",
  placements: [
    place("market-snapshot", "snapshot", 0, "full", { pinned: true }),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-heatmap", "snapshot", 2, "full"),
    place("market-breadth", "snapshot", 3, "full"),
    place("market-movers", "snapshot", 4, "large"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("watchlist", "main", 1, "medium"),
    place("ai-alerts", "main", 2, "medium"),
    place("market-news", "main", 3, "medium"),
    place("results-calendar", "main", 4, "medium"),
    place("ai-brief", "main", 5, "medium"),
    place("portfolio-summary", "main", 6, "large", { visible: false }),
    place("portfolio-health", "main", 7, "large", { visible: false }),
    place("research-summary", "main", 8, "medium", { visible: false }),
    place("economic-calendar", "main", 9, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full", { visible: false }),
  ],
};

const investor: DashboardTemplate = {
  id: "investor",
  name: "Long Term Investing",
  description: "Long-horizon view: portfolio, earnings and research",
  placements: [
    place("portfolio-summary", "main", 0, "full", { pinned: true }),
    place("research-summary", "main", 1, "medium"),
    place("results-calendar", "main", 2, "medium"),
    place("economic-calendar", "main", 3, "medium"),
    place("ai-brief", "main", 4, "medium"),
    place("portfolio-health", "main", 5, "full"),
    place("ai-opportunities", "main", 6, "full"),
    place("market-snapshot", "snapshot", 0, "full"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("market-heatmap", "snapshot", 3, "full", { visible: false }),
    place("market-movers", "snapshot", 4, "large", { visible: false }),
    place("watchlist", "main", 7, "medium"),
    place("ai-alerts", "main", 8, "medium", { visible: false }),
    place("market-news", "main", 9, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const minimal: DashboardTemplate = {
  id: "minimal",
  name: "Minimal",
  description: "Markets, one idea feed and the watchlist — nothing else",
  placements: [
    place("market-snapshot", "snapshot", 0, "full"),
    place("ai-opportunities", "main", 0, "full"),
    place("watchlist", "main", 1, "full"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("market-heatmap", "snapshot", 3, "full", { visible: false }),
    place("market-movers", "snapshot", 4, "large", { visible: false }),
    place("portfolio-summary", "main", 2, "large", { visible: false }),
    place("portfolio-health", "main", 3, "large", { visible: false }),
    place("ai-brief", "main", 4, "small", { visible: false }),
    place("ai-alerts", "main", 5, "medium", { visible: false }),
    place("research-summary", "main", 6, "medium", { visible: false }),
    place("results-calendar", "main", 7, "small", { visible: false }),
    place("economic-calendar", "main", 8, "medium", { visible: false }),
    place("market-news", "main", 9, "small", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full", { visible: false }),
  ],
};

const executive: DashboardTemplate = {
  id: "executive",
  name: "Executive",
  description: "High-level oversight: summaries, health and validation",
  placements: [
    place("market-snapshot", "snapshot", 0, "full"),
    place("portfolio-summary", "main", 0, "large", { pinned: true }),
    place("ai-brief", "main", 1, "small"),
    place("research-summary", "main", 2, "medium"),
    place("portfolio-health", "main", 3, "large"),
    place("validation-center", "main", 4, "small"),
    place("results-calendar", "main", 5, "medium"),
    place("market-news", "main", 6, "medium"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("market-heatmap", "snapshot", 3, "full", { visible: false }),
    place("market-movers", "snapshot", 4, "large", { visible: false }),
    place("ai-opportunities", "main", 7, "full", { visible: false }),
    place("ai-alerts", "main", 8, "medium", { visible: false }),
    place("economic-calendar", "main", 9, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full", { visible: false }),
  ],
};

/** Blank slate for user-arranged workspaces (starts as Default). */
const custom: DashboardTemplate = {
  id: "custom",
  name: "Custom",
  description: "Start from the full layout and arrange it your way",
  placements: institutional.placements,
};

export const DASHBOARD_TEMPLATES: readonly DashboardTemplate[] = Object.freeze([
  institutional,
  swingTrader,
  investor,
  research,
  portfolio,
  minimal,
  executive,
  custom,
]);

export const DEFAULT_TEMPLATE_ID = "institutional";

export function getTemplate(id: string): DashboardTemplate | null {
  return DASHBOARD_TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Workspace search — layouts by name or description. */
export function searchTemplates(query: string): DashboardTemplate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...DASHBOARD_TEMPLATES];
  return DASHBOARD_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle)
  );
}
