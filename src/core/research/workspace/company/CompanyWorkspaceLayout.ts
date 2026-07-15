/**
 * Company Workspace layout (Sprint 10A.R3).
 * Expandable panels, collapsible sections, sticky overview.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  COMPANY_PANEL_IDS,
  COMPANY_PANEL_LABELS,
  COMPANY_WORKSPACE_EMPTY,
  type CompanyPanelId,
} from "./CompanyWorkspaceModels";

export interface CompanyLayoutState {
  workspaceKey: string;
  ticker: string;
  panelOrder: CompanyPanelId[];
  expanded: Record<CompanyPanelId, boolean>;
  collapsedSections: Record<string, boolean>;
  stickyOverview: boolean;
  updatedAt: string;
  empty: boolean;
  emptyMessage: string;
}

const layouts = new Map<string, CompanyLayoutState>();

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function keyFor(ticker: string): string {
  return safeWorkspaceText(ticker, "").toUpperCase();
}

export function defaultCompanyLayout(
  ticker: string,
  now?: Date | null
): CompanyLayoutState {
  const t = keyFor(ticker);
  const expanded = Object.fromEntries(
    COMPANY_PANEL_IDS.map((id) => [id, true])
  ) as Record<CompanyPanelId, boolean>;

  return {
    workspaceKey: t ? `company:${t}` : "",
    ticker: t,
    panelOrder: [...COMPANY_PANEL_IDS],
    expanded,
    collapsedSections: {},
    stickyOverview: true,
    updatedAt: stamp(now),
    empty: !t,
    emptyMessage: t
      ? COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      : COMPANY_WORKSPACE_EMPTY.noCompanySelected,
  };
}

export function ensureCompanyLayout(
  ticker: string,
  now?: Date | null
): CompanyLayoutState {
  const t = keyFor(ticker);
  if (!t) return defaultCompanyLayout("", now);
  const existing = layouts.get(t);
  if (existing) return existing;
  const layout = defaultCompanyLayout(t, now);
  layouts.set(t, layout);
  return layout;
}

export function getCompanyLayout(ticker: string): CompanyLayoutState | null {
  const t = keyFor(ticker);
  if (!t) return null;
  return layouts.get(t) ?? null;
}

export function toggleCompanyPanel(
  ticker: string,
  panel: CompanyPanelId,
  expanded?: boolean,
  now?: Date | null
): CompanyLayoutState {
  const layout = ensureCompanyLayout(ticker, now);
  const nextExpanded = {
    ...layout.expanded,
    [panel]: expanded == null ? !layout.expanded[panel] : Boolean(expanded),
  };
  const next: CompanyLayoutState = {
    ...layout,
    expanded: nextExpanded,
    updatedAt: stamp(now),
    empty: false,
  };
  layouts.set(layout.ticker, next);
  return next;
}

export function toggleCompanySection(
  ticker: string,
  sectionId: string,
  collapsed?: boolean,
  now?: Date | null
): CompanyLayoutState {
  const layout = ensureCompanyLayout(ticker, now);
  const id = safeWorkspaceText(sectionId, "");
  const nextCollapsed = {
    ...layout.collapsedSections,
    [id]:
      collapsed == null
        ? !layout.collapsedSections[id]
        : Boolean(collapsed),
  };
  const next: CompanyLayoutState = {
    ...layout,
    collapsedSections: nextCollapsed,
    updatedAt: stamp(now),
  };
  layouts.set(layout.ticker, next);
  return next;
}

export function reorderCompanyPanels(
  ticker: string,
  order: CompanyPanelId[],
  now?: Date | null
): CompanyLayoutState {
  const layout = ensureCompanyLayout(ticker, now);
  const valid = order.filter((id) =>
    (COMPANY_PANEL_IDS as readonly string[]).includes(id)
  );
  const missing = COMPANY_PANEL_IDS.filter((id) => !valid.includes(id));
  const next: CompanyLayoutState = {
    ...layout,
    panelOrder: [...valid, ...missing],
    updatedAt: stamp(now),
  };
  layouts.set(layout.ticker, next);
  return next;
}

export function companyPanelLabel(id: CompanyPanelId): string {
  return COMPANY_PANEL_LABELS[id];
}

export function resetCompanyLayouts(): void {
  layouts.clear();
}

export class CompanyWorkspaceLayout {
  ensure = ensureCompanyLayout;
  togglePanel = toggleCompanyPanel;
  toggleSection = toggleCompanySection;
  reorder = reorderCompanyPanels;
  reset = resetCompanyLayouts;
}
