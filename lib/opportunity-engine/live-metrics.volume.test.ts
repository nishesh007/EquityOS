import { describe, expect, it, vi, afterEach } from "vitest";
import { enrichMetricsWithTechnicals } from "@/lib/opportunity-engine/live-metrics";
import type { OhlcBar } from "@/lib/providers/types";

function bars(n: number): OhlcBar[] {
  const out: OhlcBar[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      timestamp: new Date((1_700_000_000 + i * 86_400) * 1000).toISOString(),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1_000_000,
    });
  }
  return out;
}

describe("enrichMetricsWithTechnicals volume_ratio", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("time-adjusts session volume during live market hours", async () => {
    // Monday 09:30 IST ≈ 15 minutes into 375-minute session → fraction 15/375=0.04
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T04:00:00.000Z")); // 09:30 IST

    const metrics = await enrichMetricsWithTechnicals(
      {
        symbol: "TEST",
        cmp: 100,
        volume: 40_000, // 4% of ADV — raw RVOL 0.04, adjusted ≈ 1.0
        has_live_quote: 1,
      },
      bars(40)
    );

    expect(metrics.has_live_technicals).toBe(1);
    expect(metrics.volume_ratio).toBeGreaterThanOrEqual(0.9);
    expect(metrics.volume_ratio).toBeLessThanOrEqual(1.1);
  });

  it("uses raw full-day volume after market close", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00.000Z")); // 17:30 IST post-close

    const metrics = await enrichMetricsWithTechnicals(
      {
        symbol: "TEST",
        cmp: 100,
        volume: 2_000_000,
        has_live_quote: 1,
      },
      bars(40)
    );

    expect(metrics.volume_ratio).toBe(2);
  });
});
