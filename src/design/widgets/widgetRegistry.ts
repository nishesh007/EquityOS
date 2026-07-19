/**
 * Sprint 10C.R6 — dashboard widget registry.
 *
 * The catalog of widgets a workspace can dock: metadata only (label,
 * category, default placement). Widget content is supplied by the page;
 * no data fetching or business logic lives here.
 */

export type WorkspaceRegion = "snapshot" | "main" | "bottom";

export const WORKSPACE_REGIONS: readonly WorkspaceRegion[] = Object.freeze([
  "snapshot",
  "main",
  "bottom",
]);

/** Workspace widget sizes → 12-column grid spans (snap-to-grid). */
export type WorkspaceSize = "small" | "medium" | "large" | "xl" | "full";

export const WORKSPACE_SIZES: readonly WorkspaceSize[] = Object.freeze([
  "small",
  "medium",
  "large",
  "xl",
  "full",
]);

export const WORKSPACE_SIZE_SPANS: Readonly<Record<WorkspaceSize, number>> =
  Object.freeze({
    small: 4,
    medium: 6,
    large: 8,
    xl: 10,
    full: 12,
  });

export const WORKSPACE_SIZE_LABELS: Readonly<Record<WorkspaceSize, string>> =
  Object.freeze({
    small: "Small",
    medium: "Medium",
    large: "Large",
    xl: "Extra Large",
    full: "Full Width",
  });

/** Snap an arbitrary 12-col span to the nearest workspace size. */
export function sizeFromSpan(span: number): WorkspaceSize {
  let best: WorkspaceSize = "small";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const size of WORKSPACE_SIZES) {
    const distance = Math.abs(WORKSPACE_SIZE_SPANS[size] - span);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = size;
    }
  }
  return best;
}

export type WidgetCategory =
  | "charts"
  | "tables"
  | "portfolio"
  | "watchlists"
  | "recommendations"
  | "research"
  | "market"
  | "calendar"
  | "news"
  | "ai"
  | "alerts"
  | "validation";

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultRegion: WorkspaceRegion;
  defaultSize: WorkspaceSize;
}

/** Built-in dockable widget catalog (matches the dashboard's sections). */
const BUILT_IN_WIDGETS: readonly WidgetDefinition[] = Object.freeze([
  { id: "market-snapshot", label: "Market Snapshot", description: "Indices with sparklines and session range", category: "charts", defaultRegion: "snapshot", defaultSize: "full" },
  { id: "market-pulse", label: "Market Pulse", description: "VIX, flow cues and market session pulse", category: "market", defaultRegion: "snapshot", defaultSize: "full" },
  { id: "market-breadth", label: "Market Internals", description: "Entire NSE breadth, participation and mood", category: "market", defaultRegion: "snapshot", defaultSize: "full" },
  { id: "market-heatmap", label: "Sector Heatmap", description: "Interactive NSE sector & stock heatmap with drilldowns", category: "market", defaultRegion: "snapshot", defaultSize: "full" },
  { id: "market-movers", label: "Market Movers", description: "Top gainers, losers and most active names", category: "market", defaultRegion: "snapshot", defaultSize: "large" },
  { id: "ai-opportunities", label: "AI Opportunities", description: "Recommendation center — conviction-ranked ideas", category: "recommendations", defaultRegion: "main", defaultSize: "full" },
  { id: "ai-alerts", label: "AI Alerts", description: "Material AI insights and market change alerts", category: "alerts", defaultRegion: "main", defaultSize: "medium" },
  { id: "portfolio-summary", label: "Portfolio", description: "Value, P&L and capital allocation", category: "portfolio", defaultRegion: "main", defaultSize: "large" },
  { id: "watchlist", label: "Watchlist", description: "Tracked symbols with live quotes", category: "watchlists", defaultRegion: "main", defaultSize: "small" },
  { id: "portfolio-health", label: "Portfolio Health", description: "Doctor analysis and diversification", category: "portfolio", defaultRegion: "main", defaultSize: "large" },
  { id: "research-summary", label: "Research Summary", description: "Research confidence and workspace shortcuts", category: "research", defaultRegion: "main", defaultSize: "medium" },
  { id: "ai-brief", label: "AI Market Brief", description: "AI-generated market summary", category: "ai", defaultRegion: "main", defaultSize: "small" },
  { id: "economic-calendar", label: "Economic Calendar", description: "Coming in Sprint 10D — macro events calendar", category: "calendar", defaultRegion: "main", defaultSize: "medium" },
  { id: "results-calendar", label: "Results Calendar", description: "Upcoming earnings and events", category: "calendar", defaultRegion: "main", defaultSize: "small" },
  { id: "market-news", label: "News", description: "Latest market headlines", category: "news", defaultRegion: "main", defaultSize: "small" },
  { id: "earnings-intelligence", label: "Earnings Intelligence", description: "Ranked earnings dashboard, alerts and history", category: "tables", defaultRegion: "bottom", defaultSize: "full" },
  { id: "validation-center", label: "Research Confidence", description: "Link to the dedicated research confidence page", category: "validation", defaultRegion: "main", defaultSize: "small" },
]);

const registry = new Map<string, WidgetDefinition>(
  BUILT_IN_WIDGETS.map((widget) => [widget.id, widget])
);

/** Public API — register an additional dockable widget type. */
export function registerWidget(definition: WidgetDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(`Widget "${definition.id}" is already registered`);
  }
  registry.set(definition.id, Object.freeze({ ...definition }));
}

export function getWidgetDefinition(id: string): WidgetDefinition | null {
  return registry.get(id) ?? null;
}

export function listWidgetDefinitions(): WidgetDefinition[] {
  return [...registry.values()];
}

/** Workspace search — widgets by label, description or category. */
export function searchWidgets(query: string): WidgetDefinition[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return listWidgetDefinitions();
  return listWidgetDefinitions().filter(
    (widget) =>
      widget.label.toLowerCase().includes(needle) ||
      widget.description.toLowerCase().includes(needle) ||
      widget.category.toLowerCase().includes(needle)
  );
}

/** Test hook — remove runtime registrations (built-ins are kept). */
export function resetWidgetRegistryForTests(): void {
  registry.clear();
  for (const widget of BUILT_IN_WIDGETS) registry.set(widget.id, widget);
}
