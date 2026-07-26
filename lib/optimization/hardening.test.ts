import { describe, expect, it } from "vitest";
import {
  clearOptimizationLog,
  createInitialWorkspaceState,
  defaultUiPreferences,
  getOptimizationLogSnapshot,
  hydrateWorkspaceFromStorage,
  loadUiPreferences,
  logOptimization,
  saveUiPreferences,
  UI_PREFS_KEY,
} from "@/lib/optimization";

describe("optimization lab hardening (11C.5)", () => {
  it("creates a complete initial workspace without crashing", () => {
    const state = createInitialWorkspaceState();
    expect(state.validation.ready).toBe(true);
    expect(state.engineSettings.searchMode).toBeTruthy();
    expect(state.walkForwardConfig.method).toBeTruthy();
    expect(state.monteCarloConfig.simulationCount).toBeGreaterThan(0);
    expect(state.activeTab).toBe("configuration");
  });

  it("persists and restores UI preferences", () => {
    if (typeof window === "undefined") {
      expect(defaultUiPreferences().version).toBe(1);
      return;
    }
    window.localStorage.removeItem(UI_PREFS_KEY);
    saveUiPreferences({
      activeTab: "monte-carlo",
      monteCarloFilters: { scenario: "all", query: "bear" },
    });
    const loaded = loadUiPreferences();
    expect(loaded.activeTab).toBe("monte-carlo");
    expect(loaded.monteCarloFilters.query).toBe("bear");
  });

  it("hydrates workspace state safely when storage is empty", () => {
    const hydrated = hydrateWorkspaceFromStorage(createInitialWorkspaceState());
    expect(hydrated.profiles.length).toBeGreaterThan(0);
    expect(hydrated.parameters.length).toBeGreaterThan(0);
    expect(hydrated.monteCarloRunning).toBe(false);
    expect(hydrated.walkForwardRunning).toBe(false);
  });

  it("records production-safe optimization log events", () => {
    clearOptimizationLog();
    logOptimization("info", "optimization_started", { sessionId: "x" });
    logOptimization("warn", "simulation_cancelled", { completed: 3 });
    logOptimization("error", "export_failed", { format: "pdf" });
    const snap = getOptimizationLogSnapshot();
    expect(snap.length).toBe(3);
    expect(snap[0]?.event).toBe("optimization_started");
    expect(snap[2]?.level).toBe("error");
    clearOptimizationLog();
    expect(getOptimizationLogSnapshot()).toHaveLength(0);
  });
});
