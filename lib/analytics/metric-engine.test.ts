import { describe, expect, it } from "vitest";
import {
  averageGain,
  averageLoss,
  computeTradeStatistics,
  lossRate,
  maximumDrawdown,
  profitFactor,
  winRate,
} from "@/lib/analytics/metric-engine";
import {
  isWithinDateRange,
  resolveTimeRangePreset,
  TIME_RANGE_PRESETS,
} from "@/lib/analytics/time-range";
import { analyticsExportService } from "@/lib/analytics/export";

describe("metric-engine", () => {
  it("computes win and loss rates", () => {
    expect(winRate(7, 10)).toBe(70);
    expect(lossRate(3, 10)).toBe(30);
    expect(winRate(0, 0)).toBe(0);
  });

  it("computes profit factor", () => {
    expect(profitFactor(150, -50)).toBe(3);
    expect(profitFactor(100, 0)).toBeNull();
  });

  it("averages gains and losses", () => {
    expect(averageGain([2, -1, 4])).toBe(3);
    expect(averageLoss([2, -1, -3])).toBe(-2);
  });

  it("computes maximum drawdown from equity curve", () => {
    expect(maximumDrawdown([100, 120, 90, 95])).toBeCloseTo(25, 5);
  });

  it("aggregates trade statistics", () => {
    const stats = computeTradeStatistics([
      { returnPercent: 4, pnl: 400, holdingMs: 3_600_000, hitTarget: true },
      { returnPercent: -2, pnl: -200, holdingMs: 1_800_000, hitStopLoss: true },
      { returnPercent: 1, pnl: 100, holdingMs: 7_200_000, hitTarget: true },
    ]);
    expect(stats.totalTrades).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBeCloseTo(66.67, 1);
    expect(stats.profitFactor).toBe(2.5);
    expect(stats.targetHitRate).toBe(100);
    expect(stats.stopLossRate).toBe(100);
  });
});

describe("time-range", () => {
  it("exposes all required presets", () => {
    expect(TIME_RANGE_PRESETS.map((p) => p.id)).toEqual([
      "today",
      "this_week",
      "this_month",
      "3_months",
      "6_months",
      "1_year",
      "all_time",
    ]);
  });

  it("resolves today bounds", () => {
    const now = new Date("2026-07-26T12:00:00.000Z");
    const range = resolveTimeRangePreset("today", now);
    expect(range.label).toBe("Today");
    expect(isWithinDateRange(now.toISOString(), range)).toBe(true);
  });
});

describe("export-service", () => {
  it("prepares requests without materializing bytes", async () => {
    const prepared = await analyticsExportService.prepare({
      format: "csv",
      title: "Paper Performance",
      payload: { rows: [] },
    });
    expect(prepared.status).toBe("preparing");
    expect(prepared.filename).toMatch(/\.csv$/);
    expect(prepared.mimeType).toBe("text/csv");
  });

  it("marks materialization as unsupported", async () => {
    const result = await analyticsExportService.materialize({
      format: "pdf",
      title: "Backtest Report",
      payload: {},
    });
    expect(result.status).toBe("unsupported");
  });
});
