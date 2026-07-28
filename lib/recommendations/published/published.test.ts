import { describe, expect, it } from "vitest";
import { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";
import { materializePublishedBundle } from "@/lib/recommendations/published/materialize";
import {
  isPublishedIntegrityValid,
  validatePublishedIntegrity,
} from "@/lib/recommendations/published/integrity";
import { publishRecommendationsAfterScan } from "@/lib/recommendations/published/server";
import { PUBLISHED_RECOMMENDATION_VERSION } from "@/lib/recommendations/published/types";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";

function minimalState(
  overrides: Partial<OpportunityEngineState> = {}
): OpportunityEngineState {
  return {
    tradingDate: "2026-07-28",
    lastScannedAt: "2026-07-28T06:00:00.000Z",
    nextScanAt: null,
    isFrozen: false,
    isScanning: false,
    marketOpen: true,
    scanCount: 1,
    universeSize: 0,
    categories: {
      intraday: [],
      swing: [],
      relative_volume: [],
      mean_reversion: [],
      breakout: [],
      momentum: [],
      ai_high_conviction: [],
    },
    recommendations: [],
    postMarket: null,
    scanHistory: [],
    lastScanMetrics: null,
    pipeline: null,
    ...overrides,
  };
}

describe("Published Recommendations SSOT", () => {
  it("builds scan id from session and scan count", () => {
    expect(buildPublishedScanId("2026-07-28", 3)).toBe("2026-07-28:3");
  });

  it("materializes bundle with integrity envelope", () => {
    const bundle = materializePublishedBundle(minimalState());
    expect(bundle.sessionId).toBe("2026-07-28");
    expect(bundle.scanId).toBe("2026-07-28:1");
    expect(bundle.recommendationVersion).toBe(PUBLISHED_RECOMMENDATION_VERSION);
    expect(Array.isArray(bundle.recommendations)).toBe(true);
    expect(bundle.strategyDashboard).toHaveLength(7);
  });

  it("attaches published bundle on scan finalize hook", () => {
    const next = publishRecommendationsAfterScan(minimalState());
    expect(next.published?.scanId).toBe("2026-07-28:1");
    expect(isPublishedIntegrityValid(next.published, next)).toBe(true);
  });

  it("rejects scanId mismatch against state", () => {
    const bundle = materializePublishedBundle(minimalState({ scanCount: 2 }));
    expect(() =>
      validatePublishedIntegrity(bundle, minimalState({ scanCount: 1 }))
    ).toThrow(/scanId mismatch/);
  });
});
