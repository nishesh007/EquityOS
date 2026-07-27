import { describe, expect, it } from "vitest";
import { buildRecommendationFreshness } from "@/lib/opportunity-engine/recommendation-freshness";
import { emptyOpportunityCategories } from "@/lib/opportunity-engine/trading-day";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";

function baseState(
  overrides: Partial<OpportunityEngineState> = {}
): OpportunityEngineState {
  return {
    tradingDate: "2026-07-24",
    lastScannedAt: "2026-07-24T10:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: false,
    scanCount: 3,
    universeSize: 100,
    categories: emptyOpportunityCategories(),
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
    pipeline: null,
    ...overrides,
  };
}

describe("buildRecommendationFreshness", () => {
  it("marks stale with Market Closed when weekend and recs exist", () => {
    // Sunday IST ≈ Saturday evening UTC for this fixture wall clock.
    const sunday = new Date("2026-07-26T08:00:00.000Z");
    const freshness = buildRecommendationFreshness(
      baseState(),
      12,
      sunday
    );
    expect(freshness.stale).toBe(true);
    expect(freshness.staleReason).toBe("Market Closed");
    expect(freshness.generatedAt).toBe("2026-07-24T10:00:00.000Z");
    expect(freshness.marketDate).toBe("2026-07-24");
    expect(freshness.displayMessage).toMatch(
      /Showing latest validated recommendations generated on/
    );
  });

  it("does not mark empty store as having recommendations", () => {
    const sunday = new Date("2026-07-26T08:00:00.000Z");
    const freshness = buildRecommendationFreshness(baseState(), 0, sunday);
    expect(freshness.hasRecommendations).toBe(false);
    expect(freshness.stale).toBe(false);
    expect(freshness.displayMessage).toBeNull();
  });

  it("marks carry-forward scans stale while awaiting today's market scan", () => {
    // Monday 10:00 IST while last scan is still Friday.
    const mondayOpen = new Date("2026-07-27T04:30:00.000Z");
    const freshness = buildRecommendationFreshness(
      baseState({
        tradingDate: "2026-07-27",
        lastScannedAt: "2026-07-24T10:00:00.000Z",
        scanCount: 0,
      }),
      12,
      mondayOpen
    );
    expect(freshness.stale).toBe(true);
    expect(freshness.staleReason).toBe("Awaiting today's market scan");
    expect(freshness.hasRecommendations).toBe(true);
  });
});
