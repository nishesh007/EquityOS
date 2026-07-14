/**
 * Scheduler Health Monitor — regression tests (observability only).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSchedulerHealth,
  classifyDataFreshness,
  computeHealthScore,
  computeNextScheduledScan,
  mapMarketState,
  resolveSchedulerStatus,
} from "@/lib/opportunity-engine/scheduler-health";
import {
  markSchedulerStarted,
  recordPersistenceWrite,
  recordSchedulerFailure,
  recordSchedulerSuccess,
  resetSchedulerObservabilityForTests,
  getSchedulerObservability,
} from "@/lib/opportunity-engine/scheduler-observability";
import {
  getNextSessionOpenISO,
  sessionOpenISOForDateKey,
} from "@/lib/market/session";
import { OPPORTUNITY_CATEGORIES, type OpportunityEngineState } from "@/lib/opportunity-engine/types";
import { buildFreshTradingDayState } from "@/lib/opportunity-engine/trading-day";

function istDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0
): Date {
  const utcMillis = Date.UTC(year, month - 1, day, hour - 5, minute - 30);
  return new Date(utcMillis);
}

function emptyState(overrides?: Partial<OpportunityEngineState>): OpportunityEngineState {
  const base = buildFreshTradingDayState("2026-07-14", true);
  return {
    ...base,
    ...overrides,
    categories: {
      ...base.categories,
      ...overrides?.categories,
    },
  };
}

beforeEach(() => {
  resetSchedulerObservabilityForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  resetSchedulerObservabilityForTests();
});

describe("classifyDataFreshness", () => {
  it("maps freshness buckets", () => {
    expect(classifyDataFreshness(48)).toBe("Excellent");
    expect(classifyDataFreshness(119)).toBe("Excellent");
    expect(classifyDataFreshness(120)).toBe("Good");
    expect(classifyDataFreshness(299)).toBe("Good");
    expect(classifyDataFreshness(300)).toBe("Delayed");
    expect(classifyDataFreshness(899)).toBe("Delayed");
    expect(classifyDataFreshness(900)).toBe("Stale");
    expect(classifyDataFreshness(null)).toBeNull();
  });
});

describe("resolveSchedulerStatus", () => {
  it("Running when market open and scheduler started", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "open",
        isFrozen: false,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("RUNNING");
  });

  it("Frozen when post-close or engine frozen", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "post_close",
        isFrozen: true,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("FROZEN");

    expect(
      resolveSchedulerStatus({
        marketStatus: "closed",
        isFrozen: true,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("FROZEN");
  });

  it("Paused (sleeping) on holiday", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "holiday",
        isFrozen: false,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("PAUSED");
  });

  it("Frozen on weekend closed market", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "closed",
        isFrozen: false,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("FROZEN");
  });

  it("Error when lastError is set", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "open",
        isFrozen: false,
        schedulerStarted: true,
        lastError: { message: "scan failed", at: new Date().toISOString() },
      })
    ).toBe("ERROR");
  });

  it("Paused during pre-open", () => {
    expect(
      resolveSchedulerStatus({
        marketStatus: "pre_open",
        isFrozen: false,
        schedulerStarted: true,
        lastError: null,
      })
    ).toBe("PAUSED");
  });
});

describe("retry / observability", () => {
  it("increments retryCount on failures and clears on success", () => {
    recordSchedulerFailure(new Error("boom"));
    recordSchedulerFailure(new Error("boom again"));
    let obs = getSchedulerObservability();
    expect(obs.retryCount).toBe(2);
    expect(obs.lastError?.message).toBe("boom again");

    recordSchedulerSuccess();
    obs = getSchedulerObservability();
    expect(obs.retryCount).toBe(0);
    expect(obs.lastError).toBeNull();
  });
});

describe("computeNextScheduledScan", () => {
  it("uses nextScanAt while market is open", () => {
    const next = istDate(2026, 7, 14, 9, 45).toISOString();
    const result = computeNextScheduledScan({
      state: emptyState({ nextScanAt: next }),
      marketStatus: "open",
      nowMs: istDate(2026, 7, 14, 9, 30).getTime(),
    });
    expect(result).toBe(next);
  });

  it("falls back to last scan + interval when nextScanAt missing", () => {
    const last = istDate(2026, 7, 14, 9, 30);
    const result = computeNextScheduledScan({
      state: emptyState({ lastScannedAt: last.toISOString(), nextScanAt: null }),
      marketStatus: "open",
      nowMs: last.getTime() + 60_000,
    });
    expect(result).toBe(new Date(last.getTime() + 15 * 60_000).toISOString());
  });

  it("points to next session open when frozen/closed", () => {
    vi.setSystemTime(istDate(2026, 7, 14, 16, 0));
    const result = computeNextScheduledScan({
      state: emptyState({ isFrozen: true, nextScanAt: null }),
      marketStatus: "post_close",
      nowMs: Date.now(),
    });
    expect(result).toBe(sessionOpenISOForDateKey("2026-07-15"));
  });

  it("weekend points to Monday open", () => {
    vi.setSystemTime(istDate(2026, 7, 11, 12, 0)); // Saturday
    const result = computeNextScheduledScan({
      state: emptyState({ isFrozen: true }),
      marketStatus: "closed",
      nowMs: Date.now(),
    });
    expect(result).toBe(sessionOpenISOForDateKey("2026-07-13"));
  });

  it("holiday points to next trading session", () => {
    vi.setSystemTime(istDate(2026, 1, 26, 12, 0)); // Republic Day
    const result = computeNextScheduledScan({
      state: emptyState({ tradingDate: "2026-01-23" }),
      marketStatus: "holiday",
      nowMs: Date.now(),
    });
    expect(result).toBe(sessionOpenISOForDateKey("2026-01-27"));
  });
});

describe("getNextSessionOpenISO", () => {
  it("returns today 09:15 before open on a trading day", () => {
    vi.setSystemTime(istDate(2026, 7, 14, 8, 0));
    expect(getNextSessionOpenISO()).toBe(sessionOpenISOForDateKey("2026-07-14"));
  });
});

describe("computeHealthScore", () => {
  it("scores excellent running state near 100", () => {
    const score = computeHealthScore({
      schedulerStatus: "RUNNING",
      dataFreshness: "Excellent",
      retryCount: 0,
      nextScheduledScan: istDate(2026, 7, 14, 9, 45).toISOString(),
      nowMs: istDate(2026, 7, 14, 9, 30).getTime(),
      marketStatus: "open",
    });
    expect(score).toBe(100);
  });

  it("penalizes stale data, errors, and retries", () => {
    const score = computeHealthScore({
      schedulerStatus: "ERROR",
      dataFreshness: "Stale",
      retryCount: 3,
      nextScheduledScan: null,
      nowMs: Date.now(),
      marketStatus: "open",
    });
    expect(score).toBeLessThanOrEqual(20);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("buildSchedulerHealth", () => {
  it("Running snapshot includes freshness and opportunity counts", () => {
    const now = istDate(2026, 7, 14, 10, 0);
    vi.setSystemTime(now);
    markSchedulerStarted(now.getTime() - 3_600_000);
    recordPersistenceWrite(now.toISOString());

    const lastScanAt = new Date(now.getTime() - 48_000).toISOString();

    const categories = emptyState().categories;
    for (const category of OPPORTUNITY_CATEGORIES) {
      categories[category] = [];
    }
    categories.intraday = [
      {
        id: "AAA:intraday",
        symbol: "AAA",
        company: "AAA",
        category: "intraday",
        side: "Long",
        rank: 1,
        previousRank: null,
        aiConvictionScore: 80,
        entryZone: { low: 1, high: 2 },
        stopLoss: 0.5,
        target1: 3,
        target2: 4,
        riskReward: 2,
        confidencePercent: 70,
        reason: "t",
        firstDetectedAt: lastScanAt,
        lastDetectedAt: lastScanAt,
        lastUpdatedAt: lastScanAt,
      },
    ];

    const health = buildSchedulerHealth({
      state: emptyState({
        lastScannedAt: lastScanAt,
        nextScanAt: istDate(2026, 7, 14, 10, 15).toISOString(),
        scanCount: 18,
        isFrozen: false,
        lastScanMetrics: {
          durationMs: 43_000,
          symbolsScanned: 5011,
          added: 2,
          removed: 1,
          updated: 3,
          scannedAt: lastScanAt,
        },
        scanHistory: [
          {
            scannedAt: lastScanAt,
            durationMs: 43_000,
            symbolsScanned: 5011,
            added: 2,
            removed: 1,
            updated: 3,
            scanCount: 18,
          },
        ],
        categories,
      }),
      marketStatus: "open",
      nowMs: now.getTime(),
      schedulerStarted: true,
      schedulerUptimeSeconds: 3600,
      lastError: null,
      retryCount: 0,
      lastPersistenceWrite: now.toISOString(),
      observabilityLastSuccess: lastScanAt,
    });

    expect(health.schedulerStatus).toBe("RUNNING");
    expect(health.marketState).toBe("OPEN");
    expect(health.scansToday).toBe(18);
    expect(health.symbolsScanned).toBe(5011);
    expect(health.opportunitiesGenerated).toBe(1);
    expect(health.dataFreshness).toBe("Excellent");
    expect(health.dataFreshnessSeconds).toBe(48);
    expect(health.averageScanDuration).toBe(43_000);
    expect(health.lastScanDuration).toBe(43_000);
    expect(health.healthScore).toBeGreaterThanOrEqual(95);
    expect(health.lastPersistenceWrite).toBeTruthy();
    expect(mapMarketState("open")).toBe("OPEN");
  });

  it("Frozen closed market points to tomorrow session", () => {
    const now = istDate(2026, 7, 14, 16, 30);
    vi.setSystemTime(now);
    const health = buildSchedulerHealth({
      state: emptyState({
        isFrozen: true,
        lastScannedAt: istDate(2026, 7, 14, 15, 35).toISOString(),
        nextScanAt: null,
        scanCount: 22,
      }),
      marketStatus: "post_close",
      nowMs: now.getTime(),
      schedulerStarted: true,
      schedulerUptimeSeconds: 20_000,
      lastError: null,
      retryCount: 0,
      lastPersistenceWrite: now.toISOString(),
      observabilityLastSuccess: null,
    });

    expect(health.schedulerStatus).toBe("FROZEN");
    expect(health.marketState).toBe("CLOSED");
    expect(health.nextScheduledScan).toBe(sessionOpenISOForDateKey("2026-07-15"));
  });

  it("Holiday shows paused/sleeping with next session date", () => {
    const now = istDate(2026, 1, 26, 11, 0);
    vi.setSystemTime(now);
    const health = buildSchedulerHealth({
      state: emptyState({ tradingDate: "2026-01-23", isFrozen: false }),
      marketStatus: "holiday",
      nowMs: now.getTime(),
      schedulerStarted: true,
      schedulerUptimeSeconds: 1000,
      lastError: null,
      retryCount: 0,
      lastPersistenceWrite: null,
      observabilityLastSuccess: null,
    });

    expect(health.schedulerStatus).toBe("PAUSED");
    expect(health.marketState).toBe("HOLIDAY");
    expect(health.nextScheduledScan).toBe(sessionOpenISOForDateKey("2026-01-27"));
  });

  it("Error status preserves retryCount", () => {
    const now = istDate(2026, 7, 14, 11, 0);
    const health = buildSchedulerHealth({
      state: emptyState({ lastScannedAt: istDate(2026, 7, 14, 10, 0).toISOString() }),
      marketStatus: "open",
      nowMs: now.getTime(),
      schedulerStarted: true,
      schedulerUptimeSeconds: 500,
      lastError: { message: "timeout", at: now.toISOString() },
      retryCount: 2,
      lastPersistenceWrite: null,
      observabilityLastSuccess: null,
    });

    expect(health.schedulerStatus).toBe("ERROR");
    expect(health.retryCount).toBe(2);
    expect(health.lastError?.message).toBe("timeout");
    expect(health.healthScore).toBeLessThan(100);
  });
});
