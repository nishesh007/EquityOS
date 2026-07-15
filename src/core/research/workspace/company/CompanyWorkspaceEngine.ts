/**
 * Company Research Workspace engine (Sprint 10A.R3).
 * Synchronized deep-analysis panels. Composes existing module outputs only.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { openCompanyTab, openTab } from "../layout";
import { getActiveWorkspace, createWorkspace } from "../WorkspaceRegistry";
import { buildOverviewPanel, buildCompanyOverview } from "./CompanyOverviewPanel";
import { buildFinancialAnalysisPanel } from "./FinancialAnalysisPanel";
import { buildTechnicalAnalysisPanel } from "./TechnicalAnalysisPanel";
import { buildValuationPanel } from "./ValuationPanel";
import { buildBusinessQualityPanel } from "./BusinessQualityPanel";
import { buildRiskAnalysisPanel } from "./RiskAnalysisPanel";
import { buildResearchInsightsPanel } from "./ResearchInsightsPanel";
import {
  ensureCompanyLayout,
  resetCompanyLayouts,
  toggleCompanyPanel,
  type CompanyLayoutState,
} from "./CompanyWorkspaceLayout";
import {
  COMPANY_WORKSPACE_EMPTY,
  defaultSyncContext,
  normalizeSnapshot,
  type CompanyOverviewView,
  type CompanyPanelId,
  type CompanyPanelView,
  type CompanyPeriod,
  type CompanyQuickAction,
  type CompanyQuickActionId,
  type CompanySyncContext,
  type CompanyTimeframe,
  type CompanyWorkspaceSnapshot,
  type CompanyWorkspaceView,
} from "./CompanyWorkspaceModels";

interface WorkspaceState {
  snapshot: CompanyWorkspaceSnapshot;
  sync: CompanySyncContext;
  pinned: boolean;
  favorite: boolean;
}

const states = new Map<string, WorkspaceState>();

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function ensureDesk(ticker: string): string {
  const active = getActiveWorkspace();
  if (active && !active.empty) return active.id;
  const created = createWorkspace({
    name: `Company · ${ticker}`,
    ticker,
  });
  return created.id;
}

export function buildQuickActions(ticker: string): CompanyQuickAction[] {
  const symbol = safeWorkspaceText(ticker, "").toUpperCase();
  const q = symbol ? encodeURIComponent(symbol) : "";
  const withTicker = (base: string) =>
    symbol ? `${base}${base.includes("?") ? "&" : "?"}ticker=${q}` : base;

  return [
    {
      id: "open_earnings",
      label: "Open Earnings",
      href: withTicker("/results?earnings=1"),
      enabled: Boolean(symbol),
    },
    {
      id: "open_alerts",
      label: "Open Alerts",
      href: withTicker("/results?alerts=1"),
      enabled: Boolean(symbol),
    },
    {
      id: "open_screener",
      label: "Open Screener",
      href: withTicker("/screener"),
      enabled: Boolean(symbol),
    },
    {
      id: "open_portfolio",
      label: "Open Portfolio",
      href: withTicker("/portfolio"),
      enabled: Boolean(symbol),
    },
    {
      id: "open_watchlist",
      label: "Open Watchlist",
      href: withTicker("/watchlist"),
      enabled: Boolean(symbol),
    },
    {
      id: "generate_report",
      label: "Generate Report",
      href: symbol
        ? `/ai/research?ticker=${q}&report=1`
        : "/ai/research",
      enabled: Boolean(symbol),
    },
    {
      id: "compare_company",
      label: "Compare Company",
      href: symbol ? `/screener?compare=${q}` : "/screener",
      enabled: Boolean(symbol),
    },
    {
      id: "pin_company",
      label: "Pin Company",
      href: symbol ? `/company/${q}` : "/research",
      enabled: Boolean(symbol),
    },
    {
      id: "favorite",
      label: "Favorite",
      href: symbol ? `/watchlist?add=${q}` : "/watchlist",
      enabled: Boolean(symbol),
    },
  ];
}

function composePanels(
  snapshot: CompanyWorkspaceSnapshot,
  layout: CompanyLayoutState
): CompanyPanelView[] {
  const builders: Record<
    CompanyPanelId,
    (s: CompanyWorkspaceSnapshot, expanded: boolean) => CompanyPanelView
  > = {
    overview: buildOverviewPanel,
    financials: buildFinancialAnalysisPanel,
    technical: buildTechnicalAnalysisPanel,
    valuation: buildValuationPanel,
    quality: buildBusinessQualityPanel,
    risk: buildRiskAnalysisPanel,
    insights: buildResearchInsightsPanel,
  };

  return layout.panelOrder.map((id) => {
    const panel = builders[id](snapshot, layout.expanded[id] !== false);
    if (Object.keys(layout.collapsedSections).length === 0) return panel;
    return {
      ...panel,
      sections: panel.sections.map((section) => ({
        ...section,
        collapsed:
          layout.collapsedSections[section.id] ?? section.collapsed,
      })),
    };
  });
}

function toView(state: WorkspaceState | null): CompanyWorkspaceView {
  if (!state || !state.snapshot.ticker) {
    return emptyCompanyWorkspaceView();
  }

  const layout = ensureCompanyLayout(state.snapshot.ticker);
  const panels = composePanels(state.snapshot, layout);
  const overview = buildCompanyOverview(state.snapshot);

  return {
    sync: state.sync,
    overview,
    panels,
    quickActions: buildQuickActions(state.snapshot.ticker),
    pinned: state.pinned,
    favorite: state.favorite,
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
    surfaceHints: {
      research: "/research",
      dashboard: "/",
      company: `/company/${state.snapshot.ticker}`,
      results: "/results",
      portfolio: "/portfolio",
      watchlist: "/watchlist",
    },
  };
}

export function emptyCompanyWorkspaceView(): CompanyWorkspaceView {
  return {
    sync: defaultSyncContext(""),
    overview: buildCompanyOverview(normalizeSnapshot(null)),
    panels: [],
    quickActions: buildQuickActions(""),
    pinned: false,
    favorite: false,
    empty: true,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
    surfaceHints: {
      research: "/research",
      dashboard: "/",
      company: "/company",
      results: "/results",
      portfolio: "/portfolio",
      watchlist: "/watchlist",
    },
  };
}

/** Public API — Sprint 10A.R3 */

export function openCompanyWorkspace(
  snapshot: Partial<CompanyWorkspaceSnapshot> | null,
  options?: {
    timeframe?: CompanyTimeframe | null;
    period?: CompanyPeriod | null;
    filters?: Record<string, string> | null;
    now?: Date | null;
  }
): CompanyWorkspaceView {
  const normalized = normalizeSnapshot(snapshot);
  if (!normalized.ticker) return emptyCompanyWorkspaceView();

  const deskId = ensureDesk(normalized.ticker);
  try {
    openCompanyTab(deskId, normalized.ticker, options?.now);
    openTab({
      workspaceId: deskId,
      kind: "research",
      ticker: normalized.ticker,
      now: options?.now,
    });
  } catch {
    /* tabs optional */
  }

  ensureCompanyLayout(normalized.ticker, options?.now);

  const sync: CompanySyncContext = {
    ...defaultSyncContext(normalized.ticker, options?.now),
    timeframe: options?.timeframe ?? "1Y",
    period: options?.period ?? "ttm",
    filters: options?.filters ?? {},
    researchContext: `Company research · ${normalized.ticker}`,
    updatedAt: stamp(options?.now),
  };

  const state: WorkspaceState = {
    snapshot: normalized,
    sync,
    pinned: false,
    favorite: false,
  };
  states.set(normalized.ticker, state);
  return toView(state);
}

export function refreshCompanyWorkspace(
  ticker: string,
  snapshot?: Partial<CompanyWorkspaceSnapshot> | null,
  now?: Date | null
): CompanyWorkspaceView {
  const key = safeWorkspaceText(ticker, "").toUpperCase();
  const existing = states.get(key);
  if (!existing && !snapshot) return emptyCompanyWorkspaceView();

  const nextSnapshot = normalizeSnapshot(
    snapshot ?? existing?.snapshot ?? null
  );
  if (!nextSnapshot.ticker) return emptyCompanyWorkspaceView();

  const sync: CompanySyncContext = {
    ...(existing?.sync ?? defaultSyncContext(nextSnapshot.ticker, now)),
    ticker: nextSnapshot.ticker,
    researchContext: `Refreshed research · ${nextSnapshot.ticker}`,
    updatedAt: stamp(now),
  };

  const state: WorkspaceState = {
    snapshot: nextSnapshot,
    sync,
    pinned: existing?.pinned ?? false,
    favorite: existing?.favorite ?? false,
  };
  states.set(nextSnapshot.ticker, state);
  return toView(state);
}

export function getCompanyOverview(ticker?: string | null): CompanyOverviewView {
  const key = safeWorkspaceText(ticker, "").toUpperCase();
  if (key) {
    const state = states.get(key);
    if (state) return buildCompanyOverview(state.snapshot);
  }
  const first = states.values().next().value as WorkspaceState | undefined;
  if (first) return buildCompanyOverview(first.snapshot);
  return buildCompanyOverview(normalizeSnapshot(null));
}

export function getResearchPanels(ticker?: string | null): CompanyPanelView[] {
  const view = getCompanyWorkspaceView(ticker);
  return view.panels;
}

export function syncWorkspacePanels(input: {
  ticker: string;
  timeframe?: CompanyTimeframe | null;
  period?: CompanyPeriod | null;
  filters?: Record<string, string> | null;
  researchContext?: string | null;
  now?: Date | null;
}): CompanyWorkspaceView {
  const key = safeWorkspaceText(input.ticker, "").toUpperCase();
  const existing = states.get(key);
  if (!existing) {
    return emptyCompanyWorkspaceView();
  }

  const sync: CompanySyncContext = {
    ...existing.sync,
    ticker: key,
    timeframe: input.timeframe ?? existing.sync.timeframe,
    period: input.period ?? existing.sync.period,
    filters: input.filters ?? existing.sync.filters,
    researchContext: safeWorkspaceText(
      input.researchContext,
      existing.sync.researchContext
    ),
    updatedAt: stamp(input.now),
  };

  const state: WorkspaceState = { ...existing, sync };
  states.set(key, state);
  return toView(state);
}

export function getCompanyWorkspaceView(
  ticker?: string | null
): CompanyWorkspaceView {
  const key = safeWorkspaceText(ticker, "").toUpperCase();
  if (key) {
    return toView(states.get(key) ?? null);
  }
  const first = states.values().next().value as WorkspaceState | undefined;
  return toView(first ?? null);
}

export function pinCompanyWorkspace(ticker: string, pinned = true): CompanyWorkspaceView {
  const key = safeWorkspaceText(ticker, "").toUpperCase();
  const existing = states.get(key);
  if (!existing) return emptyCompanyWorkspaceView();
  const state = { ...existing, pinned: Boolean(pinned) };
  states.set(key, state);
  return toView(state);
}

export function favoriteCompanyWorkspace(
  ticker: string,
  favorite = true
): CompanyWorkspaceView {
  const key = safeWorkspaceText(ticker, "").toUpperCase();
  const existing = states.get(key);
  if (!existing) return emptyCompanyWorkspaceView();
  const state = { ...existing, favorite: Boolean(favorite) };
  states.set(key, state);
  return toView(state);
}

export function setCompanyPanelExpanded(
  ticker: string,
  panel: CompanyPanelId,
  expanded?: boolean
): CompanyWorkspaceView {
  toggleCompanyPanel(ticker, panel, expanded);
  return getCompanyWorkspaceView(ticker);
}

export function getQuickAction(
  ticker: string,
  action: CompanyQuickActionId
): CompanyQuickAction | null {
  return buildQuickActions(ticker).find((a) => a.id === action) ?? null;
}

export function resetCompanyWorkspace(): void {
  states.clear();
  resetCompanyLayouts();
}

export class CompanyWorkspaceEngine {
  openCompanyWorkspace = openCompanyWorkspace;
  refreshCompanyWorkspace = refreshCompanyWorkspace;
  getCompanyOverview = getCompanyOverview;
  getResearchPanels = getResearchPanels;
  syncWorkspacePanels = syncWorkspacePanels;
  reset = resetCompanyWorkspace;
}
