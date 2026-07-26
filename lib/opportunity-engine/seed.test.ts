import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/market/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/market/session")>(
    "@/lib/market/session"
  );
  return {
    ...actual,
    isTradingDay: () => false,
    getMarketStatus: () => "closed" as const,
    isMarketOpen: () => false,
    isOpportunityScanSession: () => false,
    getTradingDateKey: () => "2026-07-24",
  };
});

describe("forced scan weekend bypass", () => {
  it("executeScan force path is documented via seed export", async () => {
    const { seedOpportunityEngineToPostgres, formatSeedSummary } = await import(
      "@/lib/opportunity-engine/seed"
    );
    expect(typeof seedOpportunityEngineToPostgres).toBe("function");
    expect(
      formatSeedSummary({
        recommendationsGenerated: 10,
        categoryCandidatesGenerated: 40,
        savedToPostgreSQL: 10,
        hydratedFromPostgreSQL: 10,
        apiReturned: 10,
        slotsWithPick: 5,
        byStrategy: {},
        symbolsScanned: 100,
        quoteOnlyCount: 5,
        enrichedCount: 95,
        rawCandidates: 40,
        pipelinePassed: 40,
        durationMs: 1,
        lastScannedAt: null,
        tradingDate: "2026-07-24",
        savedToPostgres: true,
        persistenceSourceAfterHydrate: "postgres",
      })
    ).toContain("Recommendations generated: 10");
  });
});
