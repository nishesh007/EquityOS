import { describe, expect, it } from "vitest";
import {
  buildStrategyValidationReport,
  buildValidationUniverse,
  createEmptyValidationFilters,
  fingerprintReplayBundle,
  listDemoReplayBundles,
  buildReplayBundle,
} from "@/lib/backtesting";

describe("strategy validation (11B.3)", () => {
  it("builds a deterministic validation report from demo sessions", () => {
    const a = buildStrategyValidationReport({
      now: new Date("2026-02-16T08:00:00.000Z"),
    });
    const b = buildStrategyValidationReport({
      now: new Date("2026-02-16T08:00:00.000Z"),
    });
    expect(a.generatedAt).toBe(b.generatedAt);
    expect(a.strategyComparison).toEqual(b.strategyComparison);
    expect(a.convictionBuckets).toEqual(b.convictionBuckets);
    expect(a.benchmarkComparison).toEqual(b.benchmarkComparison);
    expect(a.insights.map((i) => i.id)).toEqual(b.insights.map((i) => i.id));
  });

  it("exposes strategy, recommendation, calibration, failure, and benchmark sections", () => {
    const report = buildStrategyValidationReport();
    expect(report.trades.length).toBeGreaterThan(0);
    expect(report.strategyComparison.length).toBeGreaterThan(0);
    expect(report.recommendationValidation.sampleSize).toBeGreaterThan(0);
    expect(report.convictionBuckets.length).toBe(4);
    expect(report.failureAnalysis.rows.length).toBeGreaterThanOrEqual(0);
    expect(report.benchmarkComparison.map((r) => r.benchmarkId)).toEqual([
      "nifty_50",
      "nifty_100",
      "nifty_500",
    ]);
    expect(report.insights.length).toBeGreaterThan(0);
  });

  it("filters by strategy without mutating the universe", () => {
    const universe = buildValidationUniverse();
    const filtered = buildStrategyValidationReport({
      trades: universe,
      filters: createEmptyValidationFilters({
        strategies: ["swing_momentum"],
      }),
    });
    expect(
      filtered.trades.every((t) => t.strategyId === "swing_momentum")
    ).toBe(true);
    expect(universe.length).toBeGreaterThanOrEqual(filtered.trades.length);
  });

  it("does not alter replay bundle fingerprints", () => {
    const [first] = listDemoReplayBundles();
    const rebuilt = buildReplayBundle({
      session: first.session,
      dataset: first.dataset,
    });
    expect(fingerprintReplayBundle(rebuilt)).toBe(
      fingerprintReplayBundle(first)
    );
  });
});
