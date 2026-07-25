/**
 * Event Intelligence filter helpers — unit tests (Sprint 10D.1).
 */

import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  createEmptyEventFilters,
  eventsForView,
  filterEvents,
  getEventCategory,
  startOfWeek,
  timelineBucket,
} from "@/src/core/events/EventFilters";
import { buildEventSeedCatalog } from "@/src/core/events/EventSeedData";

describe("EventFilters", () => {
  const today = "2026-07-25";
  const events = buildEventSeedCatalog(today);

  it("builds a non-empty seed catalog", () => {
    expect(events.length).toBeGreaterThan(10);
  });

  it("filters by search across company and ticker", () => {
    const filters = createEmptyEventFilters();
    const result = filterEvents(events, filters, "TCS", today);
    expect(result.every((e) => (e.ticker ?? "").includes("TCS") || e.title.includes("TCS") || (e.company ?? "").includes("TCS") || e.affectedStocks.includes("TCS"))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by event type", () => {
    const filters = {
      ...createEmptyEventFilters(),
      eventTypes: ["cpi" as const],
    };
    const result = filterEvents(events, filters, "", today);
    expect(result).toHaveLength(1);
    expect(result[0]?.eventType).toBe("cpi");
  });

  it("scopes day view to selected date", () => {
    const dayEvents = eventsForView(events, "day", today);
    expect(dayEvents.every((e) => e.date === today)).toBe(true);
  });

  it("scopes week view to Monday–Sunday window", () => {
    const weekStart = startOfWeek(today);
    const weekEnd = "2026-07-26"; // Sunday of the week containing 2026-07-25
    expect(weekStart).toBe("2026-07-20");
    const weekEvents = eventsForView(events, "week", today);
    expect(weekEvents.every((e) => e.date >= weekStart && e.date <= weekEnd)).toBe(
      true
    );
    expect(weekEvents.length).toBeGreaterThan(0);
  });

  it("classifies timeline buckets", () => {
    expect(timelineBucket(today, today)).toBe("today");
    expect(timelineBucket("2026-07-26", today)).toBe("tomorrow");
    expect(timelineBucket("2026-08-01", today)).toBe("future");
    expect(timelineBucket("2026-07-20", today)).toBe("past");
  });

  it("counts active filters", () => {
    expect(countActiveFilters(createEmptyEventFilters())).toBe(0);
    expect(
      countActiveFilters({
        ...createEmptyEventFilters(),
        ticker: "INFY",
        quickRanges: ["today"],
      })
    ).toBe(2);
  });

  it("filters upcoming earnings via quick range", () => {
    const filters = {
      ...createEmptyEventFilters(),
      quickRanges: ["upcoming_earnings" as const],
    };
    const result = filterEvents(events, filters, "", today);
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (e) =>
          (e.eventType === "quarterly_results" ||
            e.eventType === "annual_results" ||
            e.eventType === "conference_call") &&
          e.date >= today
      )
    ).toBe(true);
  });

  it("attaches earnings preview payloads to result events", () => {
    const earnings = events.filter((e) => e.eventType === "quarterly_results");
    expect(earnings.length).toBeGreaterThan(0);
    expect(earnings.every((e) => e.earningsDetail != null)).toBe(true);
    expect(earnings[0]?.earningsDetail?.historical.quarters.length).toBe(8);
  });

  it("attaches macro detail payloads to economic events", () => {
    const macro = events.filter((e) => e.macroDetail != null);
    expect(macro.length).toBeGreaterThan(10);
    expect(macro.every((e) => e.macroDetail?.indicator != null)).toBe(true);
    expect(macro.every((e) => e.macroDetail?.sectorImpact != null)).toBe(true);
    expect(macro.every((e) => e.macroDetail?.aiPlaceholder != null)).toBe(true);
  });

  it("filters central bank macro events via quick range", () => {
    const filters = {
      ...createEmptyEventFilters(),
      quickRanges: ["central_banks" as const],
    };
    const result = filterEvents(events, filters, "", today);
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (e) =>
          e.macroDetail?.theme === "central_bank" ||
          getEventCategory(e.eventType) === "central_bank"
      )
    ).toBe(true);
  });

  it("filters by macro theme and region", () => {
    const filters = {
      ...createEmptyEventFilters(),
      macroThemes: ["inflation" as const],
      macroRegions: ["india" as const],
    };
    const result = filterEvents(events, filters, "", today);
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (e) =>
          e.macroDetail?.theme === "inflation" &&
          e.macroDetail?.region === "india"
      )
    ).toBe(true);
  });
});
