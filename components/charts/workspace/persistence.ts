/**
 * Chart workspace preferences + drawings — localStorage only.
 */

import {
  DEFAULT_CHART_PREFS,
  DEFAULT_INDICATORS,
  type ChartDrawing,
  type ChartWorkspacePrefs,
  type IndicatorConfig,
} from "./types";

const PREFS_KEY = "equityos.chart.workspace.v1";
const INDICATORS_KEY = "equityos.chart.indicators.v1";
const DRAWINGS_KEY = "equityos.chart.drawings.v1";

function browserStorage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function loadChartPrefs(): ChartWorkspacePrefs {
  const storage = browserStorage();
  if (!storage) return { ...DEFAULT_CHART_PREFS };
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_CHART_PREFS };
    const parsed = JSON.parse(raw) as Partial<ChartWorkspacePrefs>;
    return {
      ...DEFAULT_CHART_PREFS,
      ...parsed,
      version: 1,
      paneTimeframes:
        Array.isArray(parsed.paneTimeframes) && parsed.paneTimeframes.length
          ? parsed.paneTimeframes
          : [...DEFAULT_CHART_PREFS.paneTimeframes],
      compareSymbols: Array.isArray(parsed.compareSymbols)
        ? parsed.compareSymbols
        : [],
    };
  } catch {
    return { ...DEFAULT_CHART_PREFS };
  }
}

export function saveChartPrefs(prefs: ChartWorkspacePrefs): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function loadIndicators(): IndicatorConfig[] {
  const storage = browserStorage();
  if (!storage) return DEFAULT_INDICATORS.map((i) => ({ ...i }));
  try {
    const raw = storage.getItem(INDICATORS_KEY);
    if (!raw) return DEFAULT_INDICATORS.map((i) => ({ ...i }));
    const parsed = JSON.parse(raw) as IndicatorConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_INDICATORS.map((i) => ({ ...i }));
    }
    // Merge with defaults so new indicators appear after upgrades.
    const byId = new Map(parsed.map((i) => [i.id, i]));
    return DEFAULT_INDICATORS.map((def, index) => {
      const existing = byId.get(def.id);
      return existing
        ? { ...def, ...existing, label: def.label, order: existing.order ?? index }
        : { ...def, order: index };
    }).sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_INDICATORS.map((i) => ({ ...i }));
  }
}

export function saveIndicators(indicators: IndicatorConfig[]): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(INDICATORS_KEY, JSON.stringify(indicators));
  } catch {
    /* ignore */
  }
}

type DrawingsStore = Record<string, ChartDrawing[]>;

function loadAllDrawings(): DrawingsStore {
  const storage = browserStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(DRAWINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DrawingsStore;
  } catch {
    return {};
  }
}

export function loadDrawings(symbol: string): ChartDrawing[] {
  return loadAllDrawings()[symbol.toUpperCase()] ?? [];
}

export function saveDrawings(symbol: string, drawings: ChartDrawing[]): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    const all = loadAllDrawings();
    all[symbol.toUpperCase()] = drawings;
    storage.setItem(DRAWINGS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
