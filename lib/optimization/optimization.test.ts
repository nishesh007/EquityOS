import { describe, expect, it } from "vitest";
import {
  OPTIMIZATION_STRATEGIES,
  buildValidationState,
  cloneConstraints,
  createInitialWorkspaceState,
  estimateRuntime,
  hydrateParameters,
  updateParameterBounds,
  updateParameterValue,
  validateConstraints,
  validateParameter,
} from "@/lib/optimization";

describe("strategy optimization workspace (11C.1)", () => {
  it("exposes eight institutional strategies", () => {
    expect(OPTIMIZATION_STRATEGIES).toHaveLength(8);
    expect(OPTIMIZATION_STRATEGIES.map((s) => s.name)).toContain(
      "Swing Breakout"
    );
  });

  it("hydrates parameters with validation status", () => {
    const params = hydrateParameters();
    expect(params.length).toBeGreaterThan(0);
    expect(params.every((p) => p.status)).toBe(true);
  });

  it("updates parameter values and flags overflow", () => {
    let params = hydrateParameters();
    const short = params.find((p) => p.id === "short_ma");
    expect(short).toBeTruthy();
    params = updateParameterValue(params, "short_ma", 999);
    const next = params.find((p) => p.id === "short_ma");
    expect(next?.status).toBe("overflow");
  });

  it("detects min/max bound conflicts", () => {
    let params = hydrateParameters();
    params = updateParameterBounds(params, "short_ma", { min: 40, max: 10 });
    const next = params.find((p) => p.id === "short_ma");
    expect(next?.status).toBe("invalid");
  });

  it("validates constraints against parameter conflicts", () => {
    const params = hydrateParameters().map((p) =>
      p.id === "holding_period" ? { ...p, current: 45, enabled: true } : p
    );
    const constraints = cloneConstraints().map((c) =>
      c.id === "max_holding_days" ? { ...c, value: 30, enabled: true } : c
    );
    const results = validateConstraints(constraints, params);
    const holding = results.find((r) => r.id === "max_holding_days");
    expect(holding?.valid).toBe(false);
  });

  it("estimates runtime from enabled parameters", () => {
    const estimate = estimateRuntime(hydrateParameters());
    expect(estimate.parameterCount).toBeGreaterThan(0);
    expect(estimate.combinationCount).toBeGreaterThan(0);
    expect(estimate.estimatedRuntime.length).toBeGreaterThan(0);
  });

  it("builds live validation state for the workspace", () => {
    const state = createInitialWorkspaceState();
    expect(state.validation.strategySelected).toBe(true);
    expect(state.validation.checks.some((c) => c.id === "ready")).toBe(true);

    const empty = buildValidationState(null, hydrateParameters(), cloneConstraints());
    expect(empty.strategySelected).toBe(false);
    expect(empty.ready).toBe(false);
  });

  it("validates dropdown and boolean parameters", () => {
    const params = hydrateParameters();
    const trailing = params.find((p) => p.id === "use_trailing_stop");
    expect(trailing).toBeTruthy();
    expect(validateParameter({ ...trailing!, enabled: true }).status).toBe(
      "valid"
    );
  });
});
