/**
 * Named saved table views — localStorage presentation preferences.
 */

import type { TableState } from "./tableEngine";
import {
  applyTablePreferences,
  tablePreferencesFromState,
  type TablePreferences,
} from "./tablePreferences";

const VIEWS_PREFIX = "equityos.table.views.";

export interface SavedTableView {
  id: string;
  name: string;
  preferences: TablePreferences & {
    sort?: TableState["sort"];
    sorts?: TableState["sorts"];
    filters?: TableState["filters"];
    rangeFilters?: TableState["rangeFilters"];
    multiFilters?: TableState["multiFilters"];
    search?: string;
  };
  createdAt: number;
}

export const BUILTIN_VIEW_PRESETS: readonly {
  id: string;
  name: string;
  density: TableState["density"];
}[] = [
  { id: "research", name: "Research View", density: "comfortable" },
  { id: "trading", name: "Trading View", density: "compact" },
  { id: "portfolio", name: "Portfolio View", density: "comfortable" },
  { id: "compact", name: "Compact View", density: "ultra" },
] as const;

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function listSavedViews(tableId: string): SavedTableView[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(VIEWS_PREFIX + tableId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTableView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews(tableId: string, views: SavedTableView[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(VIEWS_PREFIX + tableId, JSON.stringify(views));
  } catch {
    /* ignore */
  }
}

export function saveNamedView(
  tableId: string,
  name: string,
  state: TableState
): SavedTableView {
  const view: SavedTableView = {
    id: `view-${Date.now().toString(36)}`,
    name: name.trim() || "Untitled view",
    preferences: {
      ...tablePreferencesFromState(state),
      sort: state.sort,
      sorts: state.sorts,
      filters: state.filters,
      rangeFilters: state.rangeFilters,
      multiFilters: state.multiFilters,
      search: state.search,
    },
    createdAt: Date.now(),
  };
  const views = listSavedViews(tableId);
  writeViews(tableId, [...views, view]);
  return view;
}

export function deleteNamedView(tableId: string, viewId: string): void {
  writeViews(
    tableId,
    listSavedViews(tableId).filter((v) => v.id !== viewId)
  );
}

export function applyNamedView(
  state: TableState,
  view: SavedTableView
): TableState {
  const prefs = view.preferences;
  let next = applyTablePreferences(state, prefs);
  if (prefs.sort !== undefined) next = { ...next, sort: prefs.sort };
  if (prefs.sorts) next = { ...next, sorts: prefs.sorts };
  if (prefs.filters) next = { ...next, filters: prefs.filters };
  if (prefs.rangeFilters) next = { ...next, rangeFilters: prefs.rangeFilters };
  if (prefs.multiFilters) next = { ...next, multiFilters: prefs.multiFilters };
  if (typeof prefs.search === "string") next = { ...next, search: prefs.search };
  return { ...next, page: 0 };
}

export function applyBuiltinDensityPreset(
  state: TableState,
  density: TableState["density"]
): TableState {
  return { ...state, density, page: 0 };
}
