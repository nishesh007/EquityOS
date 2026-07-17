/**
 * Sprint 10C.R4 — table preference persistence (density, column layout,
 * page size). Guarded for SSR; storage failures are swallowed.
 */

import type { DensityMode, TableState } from "./tableEngine";
import { DENSITY_MODES } from "./tableEngine";

const STORAGE_PREFIX = "equityos.table.";

export interface TablePreferences {
  density?: DensityMode;
  hiddenColumns?: readonly string[];
  columnOrder?: readonly string[];
  columnWidths?: Record<string, number>;
  pageSize?: number;
}

export function tablePreferencesFromState(state: TableState): TablePreferences {
  return {
    density: state.density,
    hiddenColumns: state.hiddenColumns,
    columnOrder: state.columnOrder,
    columnWidths: state.columnWidths,
    pageSize: state.pageSize,
  };
}

/** Merge stored preferences over a base state (invalid values ignored). */
export function applyTablePreferences(
  state: TableState,
  preferences: TablePreferences | null
): TableState {
  if (!preferences) return state;
  const next = { ...state };
  if (
    preferences.density &&
    DENSITY_MODES.includes(preferences.density)
  ) {
    next.density = preferences.density;
  }
  if (Array.isArray(preferences.hiddenColumns)) {
    next.hiddenColumns = preferences.hiddenColumns.filter(
      (id): id is string => typeof id === "string"
    );
  }
  if (Array.isArray(preferences.columnOrder)) {
    next.columnOrder = preferences.columnOrder.filter(
      (id): id is string => typeof id === "string"
    );
  }
  if (
    preferences.columnWidths &&
    typeof preferences.columnWidths === "object"
  ) {
    next.columnWidths = Object.fromEntries(
      Object.entries(preferences.columnWidths).filter(
        ([, width]) => typeof width === "number" && Number.isFinite(width)
      )
    );
  }
  if (
    typeof preferences.pageSize === "number" &&
    Number.isFinite(preferences.pageSize) &&
    preferences.pageSize >= 1
  ) {
    next.pageSize = Math.round(preferences.pageSize);
  }
  return next;
}

/** Public API — persist table preferences for a table id. */
export function saveTablePreferences(
  tableId: string,
  preferences: TablePreferences,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): boolean {
  const store =
    storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return false;
  try {
    store.setItem(STORAGE_PREFIX + tableId, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

/** Public API — restore previously saved preferences (null when absent). */
export function restoreTablePreferences(
  tableId: string,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): TablePreferences | null {
  const store =
    storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_PREFIX + tableId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TablePreferences;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearTablePreferences(
  tableId: string,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): void {
  const store =
    storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(STORAGE_PREFIX + tableId);
  } catch {
    // ignore storage failures
  }
}
