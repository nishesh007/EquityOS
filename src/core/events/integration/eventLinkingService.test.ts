import { describe, expect, it } from "vitest";
import {
  buildDashboardEventBuckets,
  buildRecommendationEventWarning,
  deriveAwarenessKinds,
  eventCountdown,
  linkEventsToSymbol,
} from "@/src/core/events/integration";
import type { EventIntelligenceEvent } from "@/types/event";

function mockEvent(
  partial: Partial<EventIntelligenceEvent> &
    Pick<EventIntelligenceEvent, "id" | "title" | "date" | "eventType">
): EventIntelligenceEvent {
  return {
    company: null,
    ticker: null,
    sector: null,
    industry: null,
    exchange: "NSE",
    time: null,
    timezone: "Asia/Kolkata",
    status: "upcoming",
    importance: "high",
    description: "",
    expectedImpact: null,
    marketDirection: "neutral",
    affectedStocks: [],
    affectedSectors: [],
    historicalAvailable: false,
    tags: [],
    marketCap: "large",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    impactScore: 80,
    ...partial,
  };
}

describe("eventLinkingService", () => {
  it("computes countdown labels", () => {
    expect(eventCountdown("2026-07-25", "2026-07-25").label).toBe("Today");
    expect(eventCountdown("2026-07-26", "2026-07-25").label).toBe("1 Day");
    expect(eventCountdown("2026-07-28", "2026-07-25").label).toBe("3 Days");
  });

  it("derives results_tomorrow awareness", () => {
    const event = mockEvent({
      id: "e1",
      title: "Persistent Results",
      date: "2026-07-26",
      eventType: "quarterly_results",
      ticker: "PERSISTENT",
    });
    expect(deriveAwarenessKinds(event, "2026-07-25")).toContain(
      "results_tomorrow"
    );
  });

  it("links events by ticker", () => {
    const events = [
      mockEvent({
        id: "e1",
        title: "Infosys Results",
        date: "2026-07-27",
        eventType: "quarterly_results",
        ticker: "INFY",
      }),
    ];
    const matches = linkEventsToSymbol(events, "INFY", {
      today: "2026-07-25",
      upcomingOnly: true,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.matchReason).toBe("ticker");
  });
});

describe("dashboardEventService", () => {
  it("buckets todays earnings and critical upcoming", () => {
    const today = "2026-07-25";
    const events = [
      mockEvent({
        id: "earn",
        title: "TCS Results",
        date: today,
        eventType: "quarterly_results",
        ticker: "TCS",
        importance: "high",
      }),
      mockEvent({
        id: "crit",
        title: "RBI Policy",
        date: "2026-07-27",
        eventType: "rbi_policy",
        importance: "critical",
        impactScore: 95,
        exchange: "MACRO",
      }),
    ];
    const buckets = buildDashboardEventBuckets(events, today);
    expect(buckets.todaysEarnings.some((e) => e.id === "earn")).toBe(true);
    expect(buckets.criticalUpcoming.some((e) => e.id === "crit")).toBe(true);
  });
});

describe("recommendationEventService", () => {
  it("builds warning label without changing recommendation logic", () => {
    const warning = buildRecommendationEventWarning(
      [
        mockEvent({
          id: "e1",
          title: "Infosys Results",
          date: "2026-07-26",
          eventType: "quarterly_results",
          ticker: "INFY",
          importance: "high",
          impactScore: 82,
        }),
      ],
      "INFY",
      "2026-07-25"
    );
    expect(warning.label).toMatch(/Results/);
    expect(warning.primary?.event.id).toBe("e1");
  });
});
