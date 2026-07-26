/**
 * Client UI preference persistence for Strategy Optimization Lab (11C.5).
 * Restores active tab, filters, and lab configs after refresh.
 */

import type { OptimizationEngineSettings } from "./engine/types";
import { DEFAULT_ENGINE_SETTINGS } from "./engine/types";
import type {
  WalkForwardConfig,
  WalkForwardFilterState,
} from "./walk-forward/types";
import {
  DEFAULT_WALK_FORWARD_CONFIG,
  DEFAULT_WALK_FORWARD_FILTERS,
} from "./walk-forward/types";
import type {
  MonteCarloConfig,
  MonteCarloFilterState,
} from "./monte-carlo/types";
import {
  DEFAULT_MONTE_CARLO_CONFIG,
  DEFAULT_MONTE_CARLO_FILTERS,
} from "./monte-carlo/types";

export const UI_PREFS_KEY = "equityos.research.optimization.ui.v1";

export type OptimizationTabId =
  | "configuration"
  | "results"
  | "walk-forward"
  | "monte-carlo";

export interface OptimizationUiPreferences {
  version: 1;
  activeTab: OptimizationTabId;
  engineSettings: OptimizationEngineSettings;
  walkForwardConfig: WalkForwardConfig;
  walkForwardFilters: WalkForwardFilterState;
  monteCarloConfig: MonteCarloConfig;
  monteCarloFilters: MonteCarloFilterState;
}

const TABS: OptimizationTabId[] = [
  "configuration",
  "results",
  "walk-forward",
  "monte-carlo",
];

function isTab(value: unknown): value is OptimizationTabId {
  return typeof value === "string" && (TABS as string[]).includes(value);
}

export function defaultUiPreferences(): OptimizationUiPreferences {
  return {
    version: 1,
    activeTab: "configuration",
    engineSettings: { ...DEFAULT_ENGINE_SETTINGS },
    walkForwardConfig: { ...DEFAULT_WALK_FORWARD_CONFIG },
    walkForwardFilters: { ...DEFAULT_WALK_FORWARD_FILTERS },
    monteCarloConfig: { ...DEFAULT_MONTE_CARLO_CONFIG },
    monteCarloFilters: { ...DEFAULT_MONTE_CARLO_FILTERS },
  };
}

export function loadUiPreferences(): OptimizationUiPreferences {
  const defaults = defaultUiPreferences();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<OptimizationUiPreferences>;
    return {
      version: 1,
      activeTab: isTab(parsed.activeTab) ? parsed.activeTab : defaults.activeTab,
      engineSettings: {
        ...defaults.engineSettings,
        ...(parsed.engineSettings ?? {}),
      },
      walkForwardConfig: {
        ...defaults.walkForwardConfig,
        ...(parsed.walkForwardConfig ?? {}),
      },
      walkForwardFilters: {
        ...defaults.walkForwardFilters,
        ...(parsed.walkForwardFilters ?? {}),
      },
      monteCarloConfig: {
        ...defaults.monteCarloConfig,
        ...(parsed.monteCarloConfig ?? {}),
        selectedScenarios: Array.isArray(parsed.monteCarloConfig?.selectedScenarios)
          ? parsed.monteCarloConfig!.selectedScenarios
          : defaults.monteCarloConfig.selectedScenarios,
      },
      monteCarloFilters: {
        ...defaults.monteCarloFilters,
        ...(parsed.monteCarloFilters ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

export function saveUiPreferences(
  prefs: Partial<OptimizationUiPreferences> &
    Pick<OptimizationUiPreferences, "activeTab">
): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadUiPreferences();
    const next: OptimizationUiPreferences = {
      ...current,
      ...prefs,
      version: 1,
      engineSettings: {
        ...current.engineSettings,
        ...(prefs.engineSettings ?? {}),
      },
      walkForwardConfig: {
        ...current.walkForwardConfig,
        ...(prefs.walkForwardConfig ?? {}),
      },
      walkForwardFilters: {
        ...current.walkForwardFilters,
        ...(prefs.walkForwardFilters ?? {}),
      },
      monteCarloConfig: {
        ...current.monteCarloConfig,
        ...(prefs.monteCarloConfig ?? {}),
      },
      monteCarloFilters: {
        ...current.monteCarloFilters,
        ...(prefs.monteCarloFilters ?? {}),
      },
    };
    window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — ignore
  }
}
