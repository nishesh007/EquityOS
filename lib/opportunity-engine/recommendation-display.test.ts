import { describe, expect, it } from "vitest";
import {
  CONVICTION_GATE_EMPTY_MESSAGE,
  partitionByConvictionGate,
  resolveConvictionTier,
  resolveFinalTarget,
  resolveTargetTimeEstimates,
} from "./recommendation-display";
import type { OpportunityCandidate } from "./types";

function candidate(
  overrides: Partial<OpportunityCandidate>
): OpportunityCandidate {
  return {
    id: "TEST:intraday",
    symbol: "TEST",
    company: "Test Ltd",
    category: "intraday",
    side: "Long",
    rank: 1,
    previousRank: null,
    aiConvictionScore: 80,
    entryZone: { low: 100, high: 101 },
    stopLoss: 98,
    target1: 104,
    target2: 108,
    riskReward: 2,
    confidencePercent: 70,
    reason: "Test setup",
    firstDetectedAt: "2026-07-18T04:00:00.000Z",
    lastDetectedAt: "2026-07-18T05:00:00.000Z",
    lastUpdatedAt: "2026-07-18T05:00:00.000Z",
    ...overrides,
  };
}

describe("resolveConvictionTier", () => {
  it("maps scores to institutional tiers", () => {
    expect(resolveConvictionTier(52).id).toBe("ignore");
    expect(resolveConvictionTier(59).id).toBe("ignore");
    expect(resolveConvictionTier(60).id).toBe("watchlist");
    expect(resolveConvictionTier(74).id).toBe("watchlist");
    expect(resolveConvictionTier(75).id).toBe("trade_setup");
    expect(resolveConvictionTier(84).id).toBe("trade_setup");
    expect(resolveConvictionTier(85).id).toBe("high_conviction");
    expect(resolveConvictionTier(100).id).toBe("high_conviction");
  });

  it("marks only 75+ tiers as executable", () => {
    expect(resolveConvictionTier(74).executable).toBe(false);
    expect(resolveConvictionTier(75).executable).toBe(true);
    expect(resolveConvictionTier(91).executable).toBe(true);
  });
});

describe("partitionByConvictionGate", () => {
  it("splits candidates into executable and watchlist, hiding sub-60 scores", () => {
    const gated = partitionByConvictionGate([
      candidate({ id: "a", aiConvictionScore: 91 }),
      candidate({ id: "b", aiConvictionScore: 78 }),
      candidate({ id: "c", aiConvictionScore: 68 }),
      candidate({ id: "d", aiConvictionScore: 55 }),
    ]);
    expect(gated.executable.map((c) => c.id)).toEqual(["a", "b"]);
    expect(gated.watchlist.map((c) => c.id)).toEqual(["c"]);
  });

  it("returns the institutional empty-state copy for gated-out tables", () => {
    expect(CONVICTION_GATE_EMPTY_MESSAGE).toContain(
      "minimum conviction threshold"
    );
    expect(CONVICTION_GATE_EMPTY_MESSAGE).toContain("every 15 minutes");
  });
});

describe("resolveTargetTimeEstimates", () => {
  it("uses relative windows, never calendar dates", () => {
    const swing = resolveTargetTimeEstimates({ category: "swing" });
    expect(swing.target1).toBe("2–3 Weeks");
    expect(swing.finalTarget).toBe("6–8 Weeks");
    const intraday = resolveTargetTimeEstimates({ category: "intraday" });
    expect(intraday.target1).toBe("1–2 Hours");
    expect(intraday.finalTarget).toBe("By Market Close");
  });
});

describe("resolveFinalTarget", () => {
  it("surfaces an engine-published final target when present", () => {
    expect(
      resolveFinalTarget(candidate({ scanMetrics: { target3: 559 } }))
    ).toBe(559);
  });

  it("returns null when no engine published a final target", () => {
    expect(resolveFinalTarget(candidate({}))).toBeNull();
    expect(
      resolveFinalTarget(candidate({ scanMetrics: { rsi: 60 } }))
    ).toBeNull();
  });
});
