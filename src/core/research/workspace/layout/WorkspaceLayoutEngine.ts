/**
 * Institutional Research Workspace — layout presets engine (Sprint 10A.R2).
 * Save / restore layouts; default, research, trading, portfolio, compact.
 * Composes R1 panel layout + R2 docking — does not rebuild foundation.
 */

import { safeWorkspaceText, type WorkspacePanelId } from "../WorkspaceModels";
import { createLayout as createPanelLayout, persistLayout } from "../WorkspaceLayout";
import {
  LAYOUT_EMPTY,
  emptySavedLayout,
  normalizeSavedLayout,
  type LayoutPresetId,
  type SavedWorkspaceLayout,
} from "./LayoutPresentationModels";
import {
  createDockLayout,
  ensureDockLayout,
  getDockLayout,
  setDockSnapshot,
  collapsePane,
  resizePane,
} from "./WorkspaceDockEngine";
import { getActiveTab, listOpenTabs } from "./WorkspaceTabEngine";

const savedLayouts = new Map<string, SavedWorkspaceLayout>();
let layoutSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

const PRESET_PANELS: Record<LayoutPresetId, WorkspacePanelId[]> = {
  default: [
    "research",
    "company",
    "financials",
    "technical",
    "valuation",
    "earnings",
    "alerts",
    "screener",
    "portfolio",
    "opportunity",
    "notes",
  ],
  research: ["research", "company", "financials", "valuation", "notes"],
  trading: ["technical", "company", "alerts", "screener", "opportunity"],
  portfolio: ["portfolio", "opportunity", "earnings", "alerts", "research"],
  compact: ["research", "company", "notes"],
};

export function applyLayoutPreset(
  workspaceId: string,
  preset: LayoutPresetId,
  now?: Date | null
): SavedWorkspaceLayout {
  const id = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!id) return emptySavedLayout(LAYOUT_EMPTY.awaitingWorkspace);

  const panels = PRESET_PANELS[preset] ?? PRESET_PANELS.default;
  createPanelLayout(id, { panels, now });
  persistLayout(id, { activePanel: panels[0] ?? "research" }, now);

  let dock = getDockLayout(id) ?? createDockLayout(id, now);
  if (preset === "compact") {
    dock = collapsePane(id, "left", true, now);
    dock = collapsePane(id, "right", true, now);
    dock = collapsePane(id, "bottom", true, now);
    dock = resizePane(id, "center", 100, now);
  } else if (preset === "trading") {
    dock = collapsePane(id, "left", false, now);
    dock = collapsePane(id, "right", false, now);
    dock = collapsePane(id, "bottom", false, now);
    dock = resizePane(id, "left", 20, now);
    dock = resizePane(id, "right", 24, now);
    dock = resizePane(id, "bottom", 30, now);
  } else if (preset === "portfolio") {
    dock = collapsePane(id, "bottom", false, now);
    dock = resizePane(id, "bottom", 35, now);
  } else if (preset === "research") {
    dock = collapsePane(id, "right", false, now);
    dock = resizePane(id, "right", 28, now);
    dock = collapsePane(id, "bottom", true, now);
  } else {
    dock = ensureDockLayout(id, now);
  }

  return saveLayout({
    workspaceId: id,
    name: `${preset} layout`,
    preset,
    now,
    dock,
  });
}

export function saveLayout(input: {
  workspaceId: string;
  name?: string | null;
  preset?: LayoutPresetId | null;
  dock?: SavedWorkspaceLayout["dock"] | null;
  now?: Date | null;
}): SavedWorkspaceLayout {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptySavedLayout(LAYOUT_EMPTY.awaitingWorkspace);

  layoutSeq += 1;
  const now = stamp(input.now);
  const tabs = listOpenTabs(workspaceId);
  const active = getActiveTab(workspaceId);
  const dock =
    input.dock ?? getDockLayout(workspaceId) ?? createDockLayout(workspaceId, input.now);
  const preset = input.preset ?? "default";

  const record = normalizeSavedLayout({
    id: `layout-${layoutSeq}-${Date.now()}`,
    workspaceId,
    name: safeWorkspaceText(input.name, `${preset} layout`),
    preset,
    tabIds: tabs.map((t) => t.id),
    dock,
    activeTabId: active?.id ?? null,
    createdAt: now,
    updatedAt: now,
    empty: false,
  });

  savedLayouts.set(record.id, record);
  return record;
}

export function restoreLayout(
  layoutId: string,
  now?: Date | null
): SavedWorkspaceLayout {
  const key = safeWorkspaceText(layoutId, "").toLowerCase();
  const existing = savedLayouts.get(key);
  if (!existing || existing.empty) {
    return emptySavedLayout(LAYOUT_EMPTY.noSavedLayout);
  }

  const panels = PRESET_PANELS[existing.preset] ?? PRESET_PANELS.default;
  createPanelLayout(existing.workspaceId, { panels, now });
  persistLayout(
    existing.workspaceId,
    { activePanel: panels[0] ?? "research" },
    now
  );
  setDockSnapshot(existing.workspaceId, existing.dock, now);

  const next = normalizeSavedLayout({
    ...existing,
    updatedAt: stamp(now),
    empty: false,
  });
  savedLayouts.set(key, next);
  return next;
}

export function getSavedLayout(id: string): SavedWorkspaceLayout | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  if (!key) return null;
  const layout = savedLayouts.get(key);
  if (!layout || layout.empty) return null;
  return layout;
}

export function listSavedLayouts(workspaceId?: string | null): SavedWorkspaceLayout[] {
  const wid = workspaceId
    ? safeWorkspaceText(workspaceId, "").toLowerCase()
    : null;
  return Array.from(savedLayouts.values())
    .filter((l) => !l.empty && (!wid || l.workspaceId === wid))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDefaultLayouts(workspaceId: string): SavedWorkspaceLayout[] {
  const wid = safeWorkspaceText(workspaceId, "").toLowerCase();
  if (!wid) return [];
  return (["default", "research", "trading", "portfolio", "compact"] as LayoutPresetId[]).map(
    (preset) =>
      normalizeSavedLayout({
        id: `preset-${preset}`,
        workspaceId: wid,
        name: `${preset} layout`,
        preset,
        tabIds: [],
        dock: createDockLayout(wid),
        activeTabId: null,
        createdAt: stamp(),
        updatedAt: stamp(),
        empty: false,
      })
  );
}

export function resetSavedLayouts(): void {
  savedLayouts.clear();
  layoutSeq = 0;
}

export class WorkspaceLayoutEngine {
  applyLayoutPreset = applyLayoutPreset;
  saveLayout = saveLayout;
  restoreLayout = restoreLayout;
  listSavedLayouts = listSavedLayouts;
  getDefaultLayouts = getDefaultLayouts;
  reset = resetSavedLayouts;
}
