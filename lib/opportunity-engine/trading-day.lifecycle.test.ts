/**
 * Opportunity Engine — trading-day lifecycle regression tests.
 * Covers day / weekend / holiday / midnight rollover and same-day scan continuity.
 * Does not exercise scoring or ranking logic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OpportunityCandidate,
  OpportunityDaySnapshot,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import type { PersistedEngineData } from "@/lib/opportunity-engine/persistence";

const archivedSnapshots = new Map<string, OpportunityDaySnapshot>();
let persistedData: PersistedEngineData | null = null;

vi.mock("@/lib/opportunity-engine/persistence", () => ({
  loadPersistedData: () => persistedData,
  persistEngineData: (data: PersistedEngineData) => {
    persistedData = structuredClone(data);
  },
  archiveOpportunitySnapshot: (snapshot: OpportunityDaySnapshot) => {
    archivedSnapshots.set(snapshot.tradingDate, structuredClone(snapshot));
  },
  loadArchivedOpportunitySnapshot: (tradingDate: string) =>
    archivedSnapshots.get(tradingDate) ?? null,
}));

import {
  __setOpportunityStoreForTests,
  ensureTradingDayLifecycle,
  freezeScan,
  getFirstDetectedMapForTests,
  getOpportunityEngineState,
  mergeCategoryResults,
  resetOpportunityStore,
} from "@/lib/opportunity-engine/store";
import {
  getTradingDateKey,
  isTradingDay,
} from "@/lib/market/session";
import {
  buildFreshTradingDayState,
  shouldRolloverTradingDay,
} from "@/lib/opportunity-engine/trading-day";

/** Build an IST wall-clock instant as a Date (via UTC offset +05:30). */
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

function emptyCategories(): OpportunityEngineState["categories"] {
  return OPPORTUNITY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {} as OpportunityEngineState["categories"]
  );
}

function makeCandidate(
  symbol: string,
  category: OpportunityCandidate["category"],
  firstDetectedAt: string
): OpportunityCandidate {
  return {
    id: `${symbol}:${category}`,
    symbol,
    company: symbol,
    category,
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 80,
    entryZone: { low: 100, high: 102 },
    stopLoss: 95,
    target1: 110,
    target2: 120,
    riskReward: 2,
    confidencePercent: 70,
    reason: "test",
    firstDetectedAt,
    lastDetectedAt: firstDetectedAt,
    lastUpdatedAt: firstDetectedAt,
  };
}

function seedActiveDay(tradingDate: string, firstDetectedAt: string): void {
  const categories = emptyCategories();
  categories.intraday = [makeCandidate("AAA", "intraday", firstDetectedAt)];
  categories.swing = [makeCandidate("BBB", "swing", firstDetectedAt)];
  categories.breakout = [makeCandidate("CCC", "breakout", firstDetectedAt)];
  categories.momentum = [makeCandidate("DDD", "momentum", firstDetectedAt)];
  categories.relative_volume = [
    makeCandidate("EEE", "relative_volume", firstDetectedAt),
  ];
  categories.mean_reversion = [
    makeCandidate("FFF", "mean_reversion", firstDetectedAt),
  ];
  categories.ai_high_conviction = [
    makeCandidate("GGG", "ai_high_conviction", firstDetectedAt),
  ];

  __setOpportunityStoreForTests({
    state: {
      ...buildFreshTradingDayState(tradingDate, true),
      lastScannedAt: firstDetectedAt,
      scanCount: 3,
      universeSize: 100,
      categories,
      postMarket: {
        tomorrowWatchlist: [],
        missedOpportunities: [],
        bestCallsOfDay: categories.intraday,
        generatedAt: firstDetectedAt,
        sessionDate: tradingDate,
      },
      isFrozen: true,
    },
    firstDetectedMap: {
      "AAA:intraday": firstDetectedAt,
      "BBB:swing": firstDetectedAt,
      "CCC:breakout": firstDetectedAt,
      "DDD:momentum": firstDetectedAt,
      "EEE:relative_volume": firstDetectedAt,
      "FFF:mean_reversion": firstDetectedAt,
      "GGG:ai_high_conviction": firstDetectedAt,
    },
    skipPersist: false,
  });
}

function expectAllCategoriesEmpty(state: OpportunityEngineState): void {
  for (const category of OPPORTUNITY_CATEGORIES) {
    expect(state.categories[category]).toEqual([]);
  }
}

beforeEach(() => {
  archivedSnapshots.clear();
  persistedData = null;
  resetOpportunityStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  resetOpportunityStore();
  archivedSnapshots.clear();
  persistedData = null;
});

describe("getTradingDateKey", () => {
  it("returns the IST calendar date on a weekday trading session", () => {
    vi.setSystemTime(istDate(2026, 7, 14, 10, 30)); // Tuesday
    expect(isTradingDay()).toBe(true);
    expect(getTradingDateKey()).toBe("2026-07-14");
  });

  it("weekend maps to the previous Friday trading date", () => {
    vi.setSystemTime(istDate(2026, 7, 11, 11, 0)); // Saturday
    expect(isTradingDay()).toBe(false);
    expect(getTradingDateKey()).toBe("2026-07-10"); // Friday

    vi.setSystemTime(istDate(2026, 7, 12, 18, 0)); // Sunday
    expect(getTradingDateKey()).toBe("2026-07-10");
  });

  it("holiday maps to the previous trading date", () => {
    // Republic Day 2026-01-26 (Monday holiday)
    vi.setSystemTime(istDate(2026, 1, 26, 12, 0));
    expect(isTradingDay()).toBe(false);
    expect(getTradingDateKey()).toBe("2026-01-23"); // prior Friday
  });
});

describe("shouldRolloverTradingDay", () => {
  it("does not rollover on first assignment or same day", () => {
    expect(shouldRolloverTradingDay(null, "2026-07-14")).toBe(false);
    expect(shouldRolloverTradingDay("2026-07-14", "2026-07-14")).toBe(false);
  });

  it("rollovers when the trading date changes", () => {
    expect(shouldRolloverTradingDay("2026-07-13", "2026-07-14")).toBe(true);
    expect(shouldRolloverTradingDay("2026-07-10", "2026-07-13")).toBe(true);
  });
});

describe("ensureTradingDayLifecycle", () => {
  it("day rollover archives prior day and clears all active categories", () => {
    const mondayDetected = istDate(2026, 7, 13, 10, 0).toISOString();
    seedActiveDay("2026-07-13", mondayDetected);

    vi.setSystemTime(istDate(2026, 7, 14, 9, 20)); // Tuesday open
    const result = ensureTradingDayLifecycle("2026-07-14");

    expect(result.rolledOver).toBe(true);
    expect(result.previousTradingDate).toBe("2026-07-13");

    const archived = archivedSnapshots.get("2026-07-13");
    expect(archived).toBeTruthy();
    expect(archived?.state.categories.intraday[0]?.symbol).toBe("AAA");
    expect(archived?.state.postMarket?.sessionDate).toBe("2026-07-13");
    expect(archived?.firstDetectedMap["AAA:intraday"]).toBe(mondayDetected);

    const state = getOpportunityEngineState();
    expect(state.tradingDate).toBe("2026-07-14");
    expect(state.isFrozen).toBe(false);
    expect(state.postMarket).toBeNull();
    expect(state.scanCount).toBe(0);
    expectAllCategoriesEmpty(state);
    expect(getFirstDetectedMapForTests().size).toBe(0);
  });

  it("weekend rollover waits until Monday trading date", () => {
    const fridayDetected = istDate(2026, 7, 10, 14, 0).toISOString();
    seedActiveDay("2026-07-10", fridayDetected);

    vi.setSystemTime(istDate(2026, 7, 11, 12, 0)); // Saturday
    const saturday = ensureTradingDayLifecycle(getTradingDateKey());
    expect(saturday.rolledOver).toBe(false);
    expect(getOpportunityEngineState().categories.intraday[0]?.symbol).toBe("AAA");
    expect(getOpportunityEngineState().postMarket?.sessionDate).toBe("2026-07-10");
    expect(archivedSnapshots.size).toBe(0);

    vi.setSystemTime(istDate(2026, 7, 13, 9, 15)); // Monday
    const monday = ensureTradingDayLifecycle(getTradingDateKey());
    expect(monday.rolledOver).toBe(true);
    expect(monday.previousTradingDate).toBe("2026-07-10");
    expect(archivedSnapshots.has("2026-07-10")).toBe(true);
    expectAllCategoriesEmpty(getOpportunityEngineState());
  });

  it("holiday rollover archives pre-holiday day on the next session", () => {
    // Friday 2026-01-23 before Republic Day Monday holiday
    const fridayDetected = istDate(2026, 1, 23, 15, 0).toISOString();
    seedActiveDay("2026-01-23", fridayDetected);

    vi.setSystemTime(istDate(2026, 1, 26, 11, 0)); // Holiday Monday
    const onHoliday = ensureTradingDayLifecycle(getTradingDateKey());
    expect(getTradingDateKey()).toBe("2026-01-23");
    expect(onHoliday.rolledOver).toBe(false);
    expect(getOpportunityEngineState().postMarket?.sessionDate).toBe("2026-01-23");

    vi.setSystemTime(istDate(2026, 1, 27, 9, 20)); // Tuesday after holiday
    const afterHoliday = ensureTradingDayLifecycle(getTradingDateKey());
    expect(getTradingDateKey()).toBe("2026-01-27");
    expect(afterHoliday.rolledOver).toBe(true);
    expect(afterHoliday.previousTradingDate).toBe("2026-01-23");
    expect(archivedSnapshots.has("2026-01-23")).toBe(true);
    expectAllCategoriesEmpty(getOpportunityEngineState());
    expect(getOpportunityEngineState().postMarket).toBeNull();
  });

  it("multiple scans on the same day keep firstDetected and do not archive", () => {
    vi.setSystemTime(istDate(2026, 7, 14, 10, 0));
    ensureTradingDayLifecycle("2026-07-14");

    const firstScanAt = istDate(2026, 7, 14, 10, 0).toISOString();
    mergeCategoryResults("intraday", [
      makeCandidate("AAA", "intraday", firstScanAt),
    ]);

    vi.setSystemTime(istDate(2026, 7, 14, 10, 15));
    ensureTradingDayLifecycle("2026-07-14");
    const secondScanAt = istDate(2026, 7, 14, 10, 15).toISOString();
    mergeCategoryResults("intraday", [
      makeCandidate("AAA", "intraday", secondScanAt),
    ]);

    vi.setSystemTime(istDate(2026, 7, 14, 11, 0));
    ensureTradingDayLifecycle("2026-07-14");
    mergeCategoryResults("intraday", [
      makeCandidate("AAA", "intraday", istDate(2026, 7, 14, 11, 0).toISOString()),
    ]);

    expect(archivedSnapshots.size).toBe(0);
    const state = getOpportunityEngineState();
    expect(state.tradingDate).toBe("2026-07-14");
    expect(state.categories.intraday).toHaveLength(1);
    expect(state.categories.intraday[0].firstDetectedAt).toBe(firstScanAt);
    expect(getFirstDetectedMapForTests().get("AAA:intraday")).toBe(firstScanAt);
  });

  it("midnight transition into the next trading day rolls over", () => {
    const tuesdayDetected = istDate(2026, 7, 14, 15, 45).toISOString();
    seedActiveDay("2026-07-14", tuesdayDetected);

    // Still Tuesday just before midnight IST
    vi.setSystemTime(istDate(2026, 7, 14, 23, 59));
    expect(getTradingDateKey()).toBe("2026-07-14");
    expect(ensureTradingDayLifecycle(getTradingDateKey()).rolledOver).toBe(false);

    // Wednesday just after midnight IST
    vi.setSystemTime(istDate(2026, 7, 15, 0, 1));
    expect(getTradingDateKey()).toBe("2026-07-15");
    const result = ensureTradingDayLifecycle(getTradingDateKey());
    expect(result.rolledOver).toBe(true);
    expect(result.previousTradingDate).toBe("2026-07-14");
    expect(archivedSnapshots.has("2026-07-14")).toBe(true);
    expectAllCategoriesEmpty(getOpportunityEngineState());
    expect(getFirstDetectedMapForTests().size).toBe(0);
  });

  it("firstDetected after rollover always belongs to the new trading day", () => {
    const priorDetected = istDate(2026, 7, 13, 11, 0).toISOString();
    seedActiveDay("2026-07-13", priorDetected);

    vi.setSystemTime(istDate(2026, 7, 14, 10, 0));
    ensureTradingDayLifecycle("2026-07-14");

    const todayDetected = istDate(2026, 7, 14, 10, 0).toISOString();
    mergeCategoryResults("intraday", [
      makeCandidate("AAA", "intraday", todayDetected),
    ]);

    const candidate = getOpportunityEngineState().categories.intraday[0];
    expect(candidate.firstDetectedAt).toBe(todayDetected);
    expect(candidate.firstDetectedAt.startsWith("2026-07-1")).toBe(true);
    expect(candidate.firstDetectedAt).not.toBe(priorDetected);
  });

  it("post-market freeze only accepts the current trading day report", () => {
    vi.setSystemTime(istDate(2026, 7, 14, 16, 0));
    ensureTradingDayLifecycle("2026-07-14");

    freezeScan({
      tomorrowWatchlist: [],
      missedOpportunities: [],
      bestCallsOfDay: [],
      generatedAt: new Date().toISOString(),
      sessionDate: "2026-07-13", // wrong day
    });
    expect(getOpportunityEngineState().postMarket).toBeNull();
    expect(getOpportunityEngineState().isFrozen).toBe(false);

    freezeScan({
      tomorrowWatchlist: [],
      missedOpportunities: [],
      bestCallsOfDay: [makeCandidate("AAA", "intraday", new Date().toISOString())],
      generatedAt: new Date().toISOString(),
      sessionDate: "2026-07-14",
    });
    const state = getOpportunityEngineState();
    expect(state.isFrozen).toBe(true);
    expect(state.postMarket?.sessionDate).toBe("2026-07-14");
  });

  it("historical archives remain available after subsequent rollovers", () => {
    seedActiveDay("2026-07-13", istDate(2026, 7, 13, 12, 0).toISOString());
    vi.setSystemTime(istDate(2026, 7, 14, 10, 0));
    ensureTradingDayLifecycle("2026-07-14");

    mergeCategoryResults("swing", [
      makeCandidate("ZZZ", "swing", istDate(2026, 7, 14, 10, 0).toISOString()),
    ]);

    vi.setSystemTime(istDate(2026, 7, 15, 10, 0));
    ensureTradingDayLifecycle("2026-07-15");

    expect(archivedSnapshots.get("2026-07-13")?.state.categories.intraday[0]?.symbol).toBe(
      "AAA"
    );
    expect(archivedSnapshots.get("2026-07-14")?.state.categories.swing[0]?.symbol).toBe(
      "ZZZ"
    );
    expectAllCategoriesEmpty(getOpportunityEngineState());
  });
});
