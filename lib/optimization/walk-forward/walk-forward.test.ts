import { describe, expect, it } from "vitest";
import {
  DEFAULT_WALK_FORWARD_CONFIG,
  assertNoLeakage,
  buildWalkForwardSplits,
  computeRobustnessScore,
  computeStabilityAnalysis,
  evaluatePassFail,
  generateTradingCalendar,
  runWalkForwardValidation,
  validateWalkForwardConfig,
} from "@/lib/optimization";

describe("walk-forward validation (11C.3)", () => {
  it("generates chronological trading calendars", () => {
    const days = generateTradingCalendar("2024-01-01", "2024-01-15");
    expect(days.length).toBeGreaterThan(5);
    for (let i = 1; i < days.length; i += 1) {
      expect(Date.parse(days[i]!)).toBeGreaterThan(Date.parse(days[i - 1]!));
    }
  });

  it("builds rolling splits without future leakage", () => {
    const { splits, error } = buildWalkForwardSplits({
      ...DEFAULT_WALK_FORWARD_CONFIG,
      method: "rolling",
      trainingBars: 60,
      testingBars: 20,
      stepSize: 20,
      validationCycles: 4,
      historyStart: "2023-01-03",
      historyEnd: "2024-12-31",
    });
    expect(error).toBeUndefined();
    expect(splits.length).toBeGreaterThan(0);
    for (const s of splits) {
      expect(assertNoLeakage(s.training, s.testing)).toBe(true);
      expect(Date.parse(s.training.end)).toBeLessThan(
        Date.parse(s.testing.start)
      );
    }
  });

  it("builds anchored and expanding splits chronologically", () => {
    for (const method of ["anchored", "expanding"] as const) {
      const { splits, error } = buildWalkForwardSplits({
        ...DEFAULT_WALK_FORWARD_CONFIG,
        method,
        trainingBars: 80,
        testingBars: 25,
        stepSize: 25,
        validationCycles: 3,
      });
      expect(error).toBeUndefined();
      expect(splits.length).toBeGreaterThan(0);
      expect(splits.every((s) => assertNoLeakage(s.training, s.testing))).toBe(
        true
      );
      if (splits.length >= 2) {
        expect(splits[1]!.training.barCount).toBeGreaterThan(
          splits[0]!.training.barCount
        );
      }
    }
  });

  it("rejects invalid config ranges", () => {
    expect(
      validateWalkForwardConfig({
        ...DEFAULT_WALK_FORWARD_CONFIG,
        trainingBars: 5,
      })
    ).toBeTruthy();
  });

  it("evaluates pass/fail rules with explicit failures", () => {
    const result = evaluatePassFail(
      {
        totalTrades: 40,
        winRate: 40,
        profitFactor: 1.0,
        sharpe: 0.2,
        sortino: 0.2,
        maxDrawdown: 25,
        avgReturn: 0.1,
        cagr: 1,
        expectancy: 0.1,
        riskReward: 1,
        recoveryFactor: 0.2,
        calmarRatio: 0.1,
        totalReturn: 1,
      },
      DEFAULT_WALK_FORWARD_CONFIG
    );
    expect(result.status).toBe("Failed");
    expect(result.rules.some((r) => !r.passed && r.id === "min_win_rate")).toBe(
      true
    );
  });

  it("runs walk-forward end-to-end and scores robustness", async () => {
    const session = await runWalkForwardValidation({
      strategyId: "swing-breakout",
      strategyName: "Swing Breakout",
      config: {
        ...DEFAULT_WALK_FORWARD_CONFIG,
        method: "rolling",
        trainingBars: 50,
        testingBars: 15,
        stepSize: 15,
        validationCycles: 3,
        minTrades: 5,
        minWinRate: 35,
        minProfitFactor: 0.8,
        minSharpe: 0,
        maxDrawdown: 40,
      },
      candidates: [
        {
          values: {
            short_ma: 10,
            long_ma: 50,
            stop_loss_pct: 2.5,
            target_pct: 5,
          },
          labels: {
            "Short MA": "10",
            "Long MA": "50",
          },
        },
      ],
      getControl: () => "running",
    });

    expect(session.status).toBe("Completed");
    expect(session.cycles.length).toBeGreaterThan(0);
    expect(session.dashboard).not.toBeNull();
    expect(session.stability).not.toBeNull();
    expect(session.dashboard!.robustness.score).toBeGreaterThanOrEqual(0);
    expect(session.dashboard!.robustness.score).toBeLessThanOrEqual(100);
    expect(session.dashboard!.insights.length).toBeGreaterThan(0);

    const stability = computeStabilityAnalysis(session.cycles);
    const score = computeRobustnessScore(session.cycles, stability);
    expect(score.grade).toBeTruthy();
  });

  it("fails cleanly when history is insufficient", async () => {
    const session = await runWalkForwardValidation({
      strategyId: "momentum",
      strategyName: "Momentum",
      config: {
        ...DEFAULT_WALK_FORWARD_CONFIG,
        historyStart: "2024-01-02",
        historyEnd: "2024-01-10",
        trainingBars: 120,
        testingBars: 40,
      },
    });
    expect(session.status).toBe("Failed");
    expect(session.error).toBeTruthy();
  });
});
