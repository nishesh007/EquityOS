/**
 * Institutional Research Workspace — tab engine (Sprint 10A.R2).
 * Unlimited tabs: open, close, pin, duplicate, restore, reorder.
 * Composes existing panel routes from R1 — does not rebuild research engines.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  LAYOUT_EMPTY,
  TAB_KIND_LABELS,
  emptyTab,
  normalizeTab,
  resolveTabRoute,
  type WorkspaceTab,
  type WorkspaceTabKind,
} from "./LayoutPresentationModels";

export interface OpenTabInput {
  workspaceId: string;
  kind: WorkspaceTabKind;
  ticker?: string | null;
  title?: string | null;
  filters?: Record<string, string> | null;
  now?: Date | null;
}

const tabs = new Map<string, WorkspaceTab>();
const activeByWorkspace = new Map<string, string>();
let tabSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function openTab(input: OpenTabInput): WorkspaceTab {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyTab(LAYOUT_EMPTY.awaitingWorkspace);

  tabSeq += 1;
  const id = `tab-${tabSeq}-${Date.now()}`;
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const kind = input.kind;
  const open = listOpenTabs(workspaceId);
  const now = stamp(input.now);

  const tab = normalizeTab({
    id,
    workspaceId,
    kind,
    title: safeWorkspaceText(
      input.title,
      ticker ? `${TAB_KIND_LABELS[kind]} · ${ticker}` : TAB_KIND_LABELS[kind]
    ),
    route: resolveTabRoute(kind, ticker),
    ticker,
    pinned: false,
    order: open.length,
    scrollTop: 0,
    filters: input.filters ?? {},
    closed: false,
    createdAt: now,
    updatedAt: now,
    empty: false,
  });

  tabs.set(id, tab);
  activeByWorkspace.set(workspaceId, id);
  return tab;
}

export function closeTab(id: string, now?: Date | null): WorkspaceTab {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = tabs.get(key);
  if (!existing || existing.empty) return emptyTab(LAYOUT_EMPTY.noOpenTabs);

  const next = normalizeTab({
    ...existing,
    closed: true,
    updatedAt: stamp(now),
    empty: false,
  });
  tabs.set(key, next);

  if (activeByWorkspace.get(existing.workspaceId) === key) {
    const remaining = listOpenTabs(existing.workspaceId);
    if (remaining.length > 0) {
      activeByWorkspace.set(existing.workspaceId, remaining[0].id);
    } else {
      activeByWorkspace.delete(existing.workspaceId);
    }
  }
  return next;
}

export function duplicateTab(id: string, now?: Date | null): WorkspaceTab {
  const existing = getTab(id);
  if (!existing || existing.closed) return emptyTab(LAYOUT_EMPTY.noOpenTabs);

  return openTab({
    workspaceId: existing.workspaceId,
    kind: existing.kind,
    ticker: existing.ticker,
    title: `${existing.title} (copy)`,
    filters: existing.filters,
    now,
  });
}

export function pinTab(
  id: string,
  pinned = true,
  now?: Date | null
): WorkspaceTab {
  const existing = getTab(id);
  if (!existing || existing.closed) return emptyTab(LAYOUT_EMPTY.noOpenTabs);

  const next = normalizeTab({
    ...existing,
    pinned: Boolean(pinned),
    updatedAt: stamp(now),
    empty: false,
  });
  tabs.set(next.id, next);
  return next;
}

export function restoreTab(id: string, now?: Date | null): WorkspaceTab {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = tabs.get(key);
  if (!existing || existing.empty) return emptyTab(LAYOUT_EMPTY.noOpenTabs);

  const open = listOpenTabs(existing.workspaceId);
  const next = normalizeTab({
    ...existing,
    closed: false,
    order: open.length,
    updatedAt: stamp(now),
    empty: false,
  });
  tabs.set(key, next);
  activeByWorkspace.set(existing.workspaceId, key);
  return next;
}

export function reorderTabs(
  workspaceId: string,
  orderedIds: string[],
  now?: Date | null
): WorkspaceTab[] {
  const wid = safeWorkspaceText(workspaceId, "").toLowerCase();
  const open = listOpenTabs(wid);
  const idSet = new Set(open.map((t) => t.id));
  const order = orderedIds
    .map((id) => safeWorkspaceText(id, "").toLowerCase())
    .filter((id) => idSet.has(id));

  for (const id of idSet) {
    if (!order.includes(id)) order.push(id);
  }

  const updated: WorkspaceTab[] = [];
  order.forEach((id, index) => {
    const tab = tabs.get(id);
    if (!tab) return;
    const next = normalizeTab({
      ...tab,
      order: index,
      updatedAt: stamp(now),
      empty: false,
    });
    tabs.set(id, next);
    updated.push(next);
  });
  return updated.sort((a, b) => a.order - b.order);
}

export function focusTab(id: string): WorkspaceTab {
  const tab = getTab(id);
  if (!tab || tab.closed) return emptyTab(LAYOUT_EMPTY.noOpenTabs);
  activeByWorkspace.set(tab.workspaceId, tab.id);
  return tab;
}

export function getTab(id: string): WorkspaceTab | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  if (!key) return null;
  const tab = tabs.get(key);
  if (!tab || tab.empty) return null;
  return tab;
}

export function getActiveTab(workspaceId: string): WorkspaceTab | null {
  const wid = safeWorkspaceText(workspaceId, "").toLowerCase();
  const activeId = activeByWorkspace.get(wid);
  if (!activeId) return null;
  const tab = getTab(activeId);
  if (!tab || tab.closed) return null;
  return tab;
}

export function listOpenTabs(workspaceId: string): WorkspaceTab[] {
  const wid = safeWorkspaceText(workspaceId, "").toLowerCase();
  return Array.from(tabs.values())
    .filter((t) => t.workspaceId === wid && !t.closed && !t.empty)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
}

export function listClosedTabs(workspaceId: string): WorkspaceTab[] {
  const wid = safeWorkspaceText(workspaceId, "").toLowerCase();
  return Array.from(tabs.values())
    .filter((t) => t.workspaceId === wid && t.closed && !t.empty)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listAllTabs(workspaceId?: string | null): WorkspaceTab[] {
  const wid = workspaceId
    ? safeWorkspaceText(workspaceId, "").toLowerCase()
    : null;
  return Array.from(tabs.values())
    .filter((t) => !t.empty && (!wid || t.workspaceId === wid))
    .sort((a, b) => a.order - b.order);
}

export function setTabScroll(
  id: string,
  scrollTop: number,
  now?: Date | null
): WorkspaceTab {
  const existing = getTab(id);
  if (!existing) return emptyTab(LAYOUT_EMPTY.noOpenTabs);
  const next = normalizeTab({
    ...existing,
    scrollTop: Math.max(0, Math.floor(scrollTop)),
    updatedAt: stamp(now),
    empty: false,
  });
  tabs.set(next.id, next);
  return next;
}

export function setTabFilters(
  id: string,
  filters: Record<string, string>,
  now?: Date | null
): WorkspaceTab {
  const existing = getTab(id);
  if (!existing) return emptyTab(LAYOUT_EMPTY.noOpenTabs);
  const next = normalizeTab({
    ...existing,
    filters,
    updatedAt: stamp(now),
    empty: false,
  });
  tabs.set(next.id, next);
  return next;
}

export function resetTabs(): void {
  tabs.clear();
  activeByWorkspace.clear();
  tabSeq = 0;
}

/** Convenience openers — compose existing routes. */
export function openCompanyTab(
  workspaceId: string,
  ticker: string,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "company", ticker, now });
}

export function openResearchTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "research", ticker, now });
}

export function openEarningsTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "earnings", ticker, now });
}

export function openAlertsTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "alerts", ticker, now });
}

export function openScreenerTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "screener", ticker, now });
}

export function openPortfolioTab(
  workspaceId: string,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "portfolio", now });
}

export function openOpportunityTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "opportunity", ticker, now });
}

export function openNotesTab(
  workspaceId: string,
  ticker?: string | null,
  now?: Date | null
): WorkspaceTab {
  return openTab({ workspaceId, kind: "notes", ticker, now });
}

export class WorkspaceTabEngine {
  openTab = openTab;
  closeTab = closeTab;
  duplicateTab = duplicateTab;
  pinTab = pinTab;
  restoreTab = restoreTab;
  reorderTabs = reorderTabs;
  focusTab = focusTab;
  listOpenTabs = listOpenTabs;
  reset = resetTabs;
}
