/**
 * Sprint 10C.R6 — built-in dashboard layout templates.
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

/** The default institutional terminal — everything, hierarchy-first. */
const institutional: DashboardTemplate = {
  id: "institutional",
  name: "Institutional",
  description: "Full terminal: markets, AI conviction, portfolio and research",
  placements: [
    place("market-snapshot", "snapshot", 0, "full", { pinned: true }),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-breadth", "snapshot", 2, "full"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("portfolio-summary", "main", 1, "large"),
    place("watchlist", "main", 2, "small"),
    place("portfolio-health", "main", 3, "large"),
    place("ai-brief", "main", 4, "small"),
    place("results-calendar", "main", 5, "small"),
    place("market-news", "main", 6, "small"),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const research: DashboardTemplate = {
  id: "research",
  name: "Research",
  description: "AI ideas, briefs and events first — portfolio minimized",
  placements: [
    place("market-snapshot", "snapshot", 0, "full"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("ai-brief", "main", 1, "medium"),
    place("market-news", "main", 2, "medium"),
    place("results-calendar", "main", 3, "medium"),
    place("watchlist", "main", 4, "medium"),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("portfolio-summary", "main", 5, "large", { visible: false }),
    place("portfolio-health", "main", 6, "large", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const portfolio: DashboardTemplate = {
  id: "portfolio",
  name: "Portfolio",
  description: "Holdings, health and allocation front and center",
  placements: [
    place("portfolio-summary", "main", 0, "full", { pinned: true }),
    place("portfolio-health", "main", 1, "full"),
    place("watchlist", "main", 2, "medium"),
    place("ai-opportunities", "main", 3, "full"),
    place("market-snapshot", "snapshot", 0, "full"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("ai-brief", "main", 4, "medium", { visible: false }),
    place("results-calendar", "main", 5, "medium"),
    place("market-news", "main", 6, "medium", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full"),
  ],
};

const swingTrader: DashboardTemplate = {
  id: "swing-trader",
  name: "Swing Trader",
  description: "Market internals, momentum and AI setups for 1–4 week trades",
  placements: [
    place("market-snapshot", "snapshot", 0, "full", { pinned: true }),
    place("market-pulse", "snapshot", 1, "full"),
    place("market-breadth", "snapshot", 2, "full"),
    place("ai-opportunities", "main", 0, "full", { pinned: true }),
    place("watchlist", "main", 1, "medium"),
    place("market-news", "main", 2, "medium"),
    place("results-calendar", "main", 3, "medium"),
    place("ai-brief", "main", 4, "medium"),
    place("portfolio-summary", "main", 5, "large", { visible: false }),
    place("portfolio-health", "main", 6, "large", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full", { visible: false }),
  ],
};

const investor: DashboardTemplate = {
  id: "investor",
  name: "Investor",
  description: "Long-horizon view: portfolio, earnings and calendar",
  placements: [
    place("portfolio-summary", "main", 0, "full", { pinned: true }),
    place("results-calendar", "main", 1, "medium"),
    place("ai-brief", "main", 2, "medium"),
    place("portfolio-health", "main", 3, "full"),
    place("ai-opportunities", "main", 4, "full"),
    place("market-snapshot", "snapshot", 0, "full"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("watchlist", "main", 5, "medium"),
    place("market-news", "main", 6, "medium", { visible: false }),
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
    place("portfolio-summary", "main", 2, "large", { visible: false }),
    place("portfolio-health", "main", 3, "large", { visible: false }),
    place("ai-brief", "main", 4, "small", { visible: false }),
    place("results-calendar", "main", 5, "small", { visible: false }),
    place("market-news", "main", 6, "small", { visible: false }),
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
    place("portfolio-health", "main", 2, "large"),
    place("validation-center", "main", 3, "small"),
    place("results-calendar", "main", 4, "medium"),
    place("market-news", "main", 5, "medium"),
    place("market-pulse", "snapshot", 1, "full", { visible: false }),
    place("market-breadth", "snapshot", 2, "full", { visible: false }),
    place("ai-opportunities", "main", 6, "full", { visible: false }),
    place("earnings-intelligence", "bottom", 0, "full", { visible: false }),
  ],
};

/** Blank slate for user-arranged workspaces (starts as Institutional). */
const custom: DashboardTemplate = {
  id: "custom",
  name: "Custom",
  description: "Start from the full layout and arrange it your way",
  placements: institutional.placements,
};

export const DASHBOARD_TEMPLATES: readonly DashboardTemplate[] = Object.freeze([
  institutional,
  research,
  portfolio,
  swingTrader,
  investor,
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
