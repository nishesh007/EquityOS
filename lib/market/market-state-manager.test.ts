import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetMarketStateManagerForTests,
  buildSessionEnvelope,
  getMarketStatePhase,
  markMarketRebuildEnd,
  markMarketRebuildStart,
  MARKET_REBUILD_MAX_MS,
} from "@/lib/market/market-state-manager";

describe("MarketStateManager rebuild phase", () => {
  beforeEach(() => {
    __resetMarketStateManagerForTests();
  });

  it("stamps ready after rebuild end (not while inflight)", () => {
    markMarketRebuildStart();
    expect(getMarketStatePhase()).toBe("updating");
    markMarketRebuildEnd();
    const envelope = buildSessionEnvelope({
      sessionDate: "2026-07-28",
      generatedAt: "2026-07-28T10:00:00.000Z",
      now: new Date("2026-07-28T10:00:00+05:30"),
    });
    expect(envelope.phase).toBe("ready");
  });

  it("auto-clears updating after max duration", () => {
    markMarketRebuildStart();
    expect(getMarketStatePhase()).toBe("updating");
    expect(
      getMarketStatePhase(Date.now() + MARKET_REBUILD_MAX_MS + 1)
    ).toBe("ready");
  });
});
