import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONTE_CARLO_CONFIG,
  bootstrapSample,
  buildBaselineTradeReturns,
  buildConfidenceIntervals,
  computeRiskMetricsFromEquity,
  createRng,
  resolveScenarios,
  runMonteCarloSimulation,
  shuffleInPlace,
  validateMonteCarloConfig,
} from "@/lib/optimization";

describe("monte carlo & stress testing (11C.4)", () => {
  it("bootstraps and shuffles trade sequences deterministically", () => {
    const rng = createRng(7);
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const boot = bootstrapSample(source, 8, rng);
    expect(boot).toHaveLength(8);
    expect(boot.every((v) => source.includes(v))).toBe(true);

    const rng2 = createRng(7);
    const shuffled = shuffleInPlace(source, rng2);
    expect(shuffled).toHaveLength(8);
    expect([...shuffled].sort()).toEqual([...source].sort());
  });

  it("resolves and combines stress scenarios", () => {
    const scenarios = resolveScenarios(
      ["crisis_2008", "covid_2020", "custom"],
      { returnShock: -0.2, volShock: 2 }
    );
    expect(scenarios).toHaveLength(3);
    expect(scenarios.some((s) => s.id === "crisis_2008")).toBe(true);
  });

  it("computes risk metrics including VaR / CVaR / ulcer", () => {
    const equity = [100];
    for (let i = 0; i < 40; i += 1) {
      equity.push(equity[equity.length - 1]! * (1 + ((i % 5) - 2) / 100));
    }
    const metrics = computeRiskMetricsFromEquity(equity);
    expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(metrics.var)).toBe(true);
    expect(Number.isFinite(metrics.cvar)).toBe(true);
    expect(Number.isFinite(metrics.ulcerIndex)).toBe(true);
  });

  it("builds confidence intervals at 50–99%", () => {
    const list = Array.from({ length: 40 }, (_, i) =>
      computeRiskMetricsFromEquity(
        buildBaselineTradeReturns({ seed: i + 1, expectedReturn: 5 }).reduce(
          (eq, r) => {
            eq.push(eq[eq.length - 1]! * (1 + r / 100));
            return eq;
          },
          [100]
        )
      )
    );
    const intervals = buildConfidenceIntervals(list);
    expect(intervals.map((i) => i.level)).toEqual([50, 75, 90, 95, 99]);
  });

  it("rejects invalid simulation config", () => {
    expect(
      validateMonteCarloConfig({
        ...DEFAULT_MONTE_CARLO_CONFIG,
        simulationCount: 2,
      })
    ).toBeTruthy();
    expect(
      validateMonteCarloConfig({
        ...DEFAULT_MONTE_CARLO_CONFIG,
        selectedScenarios: [],
      })
    ).toBeTruthy();
  });

  it("runs monte carlo end-to-end with stress scenarios", async () => {
    const session = await runMonteCarloSimulation({
      strategyId: "swing-breakout",
      strategyName: "Swing Breakout",
      config: {
        ...DEFAULT_MONTE_CARLO_CONFIG,
        simulationCount: 60,
        mode: "custom",
        selectedScenarios: ["bear_market", "high_volatility", "bull_market"],
        randomSeed: 11,
      },
      baselineReturns: buildBaselineTradeReturns({
        seed: 11,
        expectedReturn: 10,
        tradeCount: 50,
      }),
      getControl: () => "running",
    });

    expect(session.status).toBe("Completed");
    expect(session.results.length).toBe(60);
    expect(session.distributions).not.toBeNull();
    expect(session.confidenceIntervals.length).toBe(5);
    expect(session.scenarioComparison.length).toBeGreaterThan(0);
    expect(session.dashboard?.insights.length).toBeGreaterThan(0);
    expect(session.dashboard?.riskGrade).toBeTruthy();
  });

  it("supports cancellation mid-run", async () => {
    let ticks = 0;
    const session = await runMonteCarloSimulation({
      strategyId: "momentum",
      strategyName: "Momentum",
      config: {
        ...DEFAULT_MONTE_CARLO_CONFIG,
        simulationCount: 80,
        selectedScenarios: ["sideways"],
      },
      onProgress: () => {
        ticks += 1;
      },
      getControl: () => (ticks > 1 ? "cancelled" : "running"),
    });
    expect(session.status).toBe("Cancelled");
  });
});
