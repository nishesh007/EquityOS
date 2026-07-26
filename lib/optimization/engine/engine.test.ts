import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMETERS,
  hydrateParameters,
  cloneConstraints,
  generateCombinations,
  expandParameterValues,
  evaluateCombination,
  rankResults,
  planSearchCombinations,
  selectSmartCombinations,
  computeRankingScore,
  createPendingSession,
  runOptimizationEngine,
} from "@/lib/optimization";

describe("strategy optimization engine (11C.2)", () => {
  it("expands integer / percentage / boolean / dropdown parameters", () => {
    const params = hydrateParameters();
    const short = params.find((p) => p.id === "short_ma")!;
    const values = expandParameterValues({
      ...short,
      enabled: true,
      min: 10,
      max: 25,
      increment: 5,
    });
    expect(values).toEqual([10, 15, 20, 25]);

    const trailing = params.find((p) => p.id === "use_trailing_stop")!;
    expect(expandParameterValues({ ...trailing, enabled: true })).toEqual([
      true,
      false,
    ]);

    const session = params.find((p) => p.id === "session_filter")!;
    expect(
      expandParameterValues({ ...session, enabled: true }).length
    ).toBeGreaterThan(1);
  });

  it("generates cartesian grid combinations", () => {
    const params = hydrateParameters().map((p) => {
      if (p.id === "short_ma") {
        return {
          ...p,
          enabled: true,
          min: 10,
          max: 20,
          increment: 10,
          current: 10,
        };
      }
      if (p.id === "long_ma") {
        return {
          ...p,
          enabled: true,
          min: 50,
          max: 100,
          increment: 50,
          current: 50,
        };
      }
      return { ...p, enabled: false };
    });
    const combos = generateCombinations(params);
    expect(combos.length).toBe(2 * 2);
    expect(combos[0]?.values.short_ma).toBeDefined();
  });

  it("smart search reduces combination count vs full grid", () => {
    const params = hydrateParameters().map((p) => {
      if (p.id === "short_ma") {
        return { ...p, enabled: true, min: 10, max: 20, increment: 5 };
      }
      if (p.id === "long_ma") {
        return { ...p, enabled: true, min: 50, max: 100, increment: 25 };
      }
      if (p.id === "stop_loss_pct") {
        return { ...p, enabled: true, min: 2, max: 4, increment: 1 };
      }
      if (p.id === "target_pct") {
        return { ...p, enabled: true, min: 5, max: 8, increment: 1.5 };
      }
      return { ...p, enabled: false };
    });
    const all = generateCombinations(params, { maxCombinations: 5000 });
    const smart = selectSmartCombinations(all, "fast");
    expect(smart.length).toBeLessThan(all.length);
    expect(smart.length).toBeGreaterThan(0);

    const planned = planSearchCombinations({
      parameters: params,
      searchMode: "smart",
      smartIntensity: "balanced",
    });
    expect(planned.length).toBeGreaterThan(0);
  });

  it("evaluates combinations into ranked metrics", () => {
    const params = hydrateParameters();
    const combos = generateCombinations(
      params.map((p) =>
        p.id === "short_ma"
          ? { ...p, enabled: true, min: 10, max: 10, increment: 1 }
          : { ...p, enabled: false }
      )
    );
    const result = evaluateCombination({
      combination: combos[0]!,
      strategyId: "swing-breakout",
      strategyName: "Swing Breakout",
      parameters: params,
      constraints: cloneConstraints().map((c) => ({ ...c, enabled: false })),
    });
    expect(result).not.toBeNull();
    expect(result!.metrics.totalTrades).toBeGreaterThan(0);
    expect(result!.metrics.profitFactor).toBeGreaterThan(0);

    const ranked = rankResults([result!], "balanced", "profitFactor");
    expect(ranked[0]?.rank).toBe(1);
    expect(
      computeRankingScore(result!, "risk_adjusted", "sharpe")
    ).toBeTypeOf("number");
  });

  it("runs grid search end-to-end with progress callbacks", async () => {
    const params = hydrateParameters().map((p) => {
      if (p.id === "short_ma") {
        return {
          ...p,
          enabled: true,
          min: 10,
          max: 15,
          increment: 5,
        };
      }
      if (p.id === "long_ma") {
        return {
          ...p,
          enabled: true,
          min: 50,
          max: 50,
          increment: 1,
        };
      }
      return { ...p, enabled: false };
    });

    const pending = createPendingSession({
      strategyId: "momentum",
      strategyName: "Momentum",
      parameters: params,
      constraints: cloneConstraints().map((c) => ({ ...c, enabled: false })),
      searchMode: "grid",
      smartIntensity: "fast",
      rankingMode: "balanced",
      primaryMetric: "profitFactor",
    });
    expect(pending.combinationCount).toBeGreaterThan(0);

    let progressHits = 0;
    const session = await runOptimizationEngine({
      strategyId: "momentum",
      strategyName: "Momentum",
      parameters: params,
      constraints: cloneConstraints().map((c) => ({ ...c, enabled: false })),
      searchMode: "grid",
      smartIntensity: "fast",
      rankingMode: "weighted",
      primaryMetric: "winRate",
      batchSize: 8,
      onProgress: () => {
        progressHits += 1;
      },
      getControl: () => "running",
    });

    expect(session.status).toBe("Completed");
    expect(progressHits).toBeGreaterThan(0);
    expect(session.results.length).toBeGreaterThan(0);
    expect(session.results[0]?.rank).toBe(1);
  });

  it("supports cancel during smart search", async () => {
    const params = hydrateParameters().map((p) =>
      ["short_ma", "long_ma", "rsi_period", "atr_length"].includes(p.id)
        ? { ...p, enabled: true }
        : { ...p, enabled: false }
    );

    let calls = 0;
    const session = await runOptimizationEngine({
      strategyId: "mean-reversion",
      strategyName: "Mean Reversion",
      parameters: params,
      constraints: cloneConstraints().map((c) => ({ ...c, enabled: false })),
      searchMode: "smart",
      smartIntensity: "fast",
      rankingMode: "single",
      primaryMetric: "sharpe",
      batchSize: 4,
      onProgress: () => {
        calls += 1;
      },
      getControl: () => (calls > 1 ? "cancelled" : "running"),
    });

    expect(session.status).toBe("Cancelled");
  });

  it("keeps default parameter catalog stable for engine", () => {
    expect(DEFAULT_PARAMETERS.length).toBeGreaterThan(10);
  });
});
