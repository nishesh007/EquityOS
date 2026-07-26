/**
 * Dedicated optimization workspace store helpers.
 * Sprint 11C.1–11C.5 — persistence + hydration for production restore.
 */

import { cloneConstraints, hydrateParameters } from "./parameters";
import { createMockQueue } from "./queue";
import {
  createDefaultProfile,
  loadProfiles,
  loadRecentProfileIds,
} from "./profiles";
import { estimateRuntime } from "./runtime";
import type { OptimizationWorkspaceState } from "./types";
import { buildValidationState } from "./validation";
import { DEFAULT_ENGINE_SETTINGS, loadSessions } from "./engine";
import {
  DEFAULT_WALK_FORWARD_CONFIG,
  DEFAULT_WALK_FORWARD_FILTERS,
  loadWalkForwardSessions,
} from "./walk-forward";
import {
  DEFAULT_MONTE_CARLO_CONFIG,
  DEFAULT_MONTE_CARLO_FILTERS,
  loadMonteCarloSessions,
} from "./monte-carlo";
import { loadUiPreferences } from "./ui-persistence";

export const ENGINE_READY_MESSAGE =
  "Optimization engine is ready. Configure parameters and run Grid or Smart Search.";

/** @deprecated Alias kept for compatibility with early 11C.1 call sites. */
export const ENGINE_UNAVAILABLE_MESSAGE = ENGINE_READY_MESSAGE;

function labDefaults(): Pick<
  OptimizationWorkspaceState,
  | "activeTab"
  | "walkForwardConfig"
  | "walkForwardSession"
  | "walkForwardHistory"
  | "walkForwardSelectedCycleId"
  | "walkForwardFilters"
  | "walkForwardExport"
  | "walkForwardRunning"
  | "monteCarloConfig"
  | "monteCarloSession"
  | "monteCarloHistory"
  | "monteCarloSelectedId"
  | "monteCarloFilters"
  | "monteCarloExport"
  | "monteCarloRunning"
> {
  return {
    activeTab: "configuration",
    walkForwardConfig: { ...DEFAULT_WALK_FORWARD_CONFIG },
    walkForwardSession: null,
    walkForwardHistory: [],
    walkForwardSelectedCycleId: null,
    walkForwardFilters: { ...DEFAULT_WALK_FORWARD_FILTERS },
    walkForwardExport: { busy: false, lastFormat: null, lastMessage: null },
    walkForwardRunning: false,
    monteCarloConfig: { ...DEFAULT_MONTE_CARLO_CONFIG },
    monteCarloSession: null,
    monteCarloHistory: [],
    monteCarloSelectedId: null,
    monteCarloFilters: { ...DEFAULT_MONTE_CARLO_FILTERS },
    monteCarloExport: { busy: false, lastFormat: null, lastMessage: null },
    monteCarloRunning: false,
  };
}

export function createInitialWorkspaceState(): OptimizationWorkspaceState {
  const parameters = hydrateParameters();
  const constraints = cloneConstraints();
  const runtime = estimateRuntime(parameters);
  const selectedStrategyId = "swing-breakout";

  return {
    selectedStrategyId,
    parameters,
    constraints,
    profiles: [createDefaultProfile(selectedStrategyId)],
    recentProfileIds: [],
    queue: createMockQueue(),
    runtime,
    validation: buildValidationState(
      selectedStrategyId,
      parameters,
      constraints,
      runtime
    ),
    runMessage: null,
    profileError: null,
    engineSettings: { ...DEFAULT_ENGINE_SETTINGS },
    currentSession: null,
    sessionHistory: [],
    comparison: { selectedIds: [] },
    exportState: { lastFormat: null, lastMessage: null, busy: false },
    runnerControl: "running",
    selectedResultId: null,
    ...labDefaults(),
  };
}

/** Hydrate client-only persistence after mount. */
export function hydrateWorkspaceFromStorage(
  base: OptimizationWorkspaceState
): OptimizationWorkspaceState {
  const profiles = loadProfiles();
  const recentProfileIds = loadRecentProfileIds();
  const defaultProfile =
    profiles.find((p) => p.isDefault) ?? profiles[0] ?? createDefaultProfile();

  const parameters = defaultProfile.parameters.length
    ? defaultProfile.parameters.map((p) => ({ ...p }))
    : hydrateParameters();
  const constraints = defaultProfile.constraints.length
    ? defaultProfile.constraints.map((c) => ({ ...c }))
    : cloneConstraints();
  const selectedStrategyId = defaultProfile.strategyId;
  const runtime = estimateRuntime(parameters);
  const sessionHistory = loadSessions();
  const walkForwardHistory = loadWalkForwardSessions();
  const monteCarloHistory = loadMonteCarloSessions();
  const ui = loadUiPreferences();

  const lastOpt =
    sessionHistory.find((s) => s.status === "Completed") ??
    sessionHistory[0] ??
    null;
  const lastWfv =
    walkForwardHistory.find((s) => s.status === "Completed") ??
    walkForwardHistory[0] ??
    null;
  const lastMc =
    monteCarloHistory.find((s) => s.status === "Completed") ??
    monteCarloHistory[0] ??
    null;

  return {
    ...base,
    selectedStrategyId,
    parameters,
    constraints,
    profiles,
    recentProfileIds,
    runtime,
    validation: buildValidationState(
      selectedStrategyId,
      parameters,
      constraints,
      runtime
    ),
    profileError: null,
    sessionHistory,
    currentSession: lastOpt,
    engineSettings: ui.engineSettings,
    comparison: { selectedIds: [] },
    exportState: { lastFormat: null, lastMessage: null, busy: false },
    runnerControl: "running",
    selectedResultId: null,
    ...labDefaults(),
    activeTab: ui.activeTab,
    walkForwardConfig: ui.walkForwardConfig,
    walkForwardFilters: ui.walkForwardFilters,
    walkForwardHistory,
    walkForwardSession: lastWfv,
    monteCarloConfig: ui.monteCarloConfig,
    monteCarloFilters: ui.monteCarloFilters,
    monteCarloHistory,
    monteCarloSession: lastMc,
  };
}

export function recomputeDerived(
  state: OptimizationWorkspaceState
): Pick<OptimizationWorkspaceState, "runtime" | "validation"> {
  const runtime = estimateRuntime(state.parameters);
  const validation = buildValidationState(
    state.selectedStrategyId,
    state.parameters,
    state.constraints,
    runtime
  );
  return { runtime, validation };
}
