/**
 * Sprint 10D.6 — Production data validation for Event Intelligence catalog.
 */

import { describe, expect, it } from "vitest";
import {
  buildEventSeedCatalog,
  createEmptyEventFilters,
  eventsForView,
  filterEvents,
  timelineBucket,
  toDateKey,
} from "@/src/core/events";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

describe("Event catalog production validation (10D.6)", () => {
  const today = toDateKey(new Date());
  const events = buildEventSeedCatalog(today);

  it("builds a non-empty catalog with unique ids", () => {
    expect(events.length).toBeGreaterThan(20);
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has valid ISO dates and optional HH:mm times", () => {
    for (const event of events) {
      expect(event.date).toMatch(DATE_RE);
      expect(Number.isNaN(Date.parse(`${event.date}T12:00:00`))).toBe(false);
      if (event.time) expect(event.time).toMatch(TIME_RE);
    }
  });

  it("keeps catalog sorted by date then time", () => {
    for (let i = 1; i < events.length; i += 1) {
      const prev = events[i - 1]!;
      const curr = events[i]!;
      if (prev.date === curr.date) {
        expect((prev.time ?? "").localeCompare(curr.time ?? "")).toBeLessThanOrEqual(
          0
        );
      } else {
        expect(prev.date.localeCompare(curr.date)).toBeLessThan(0);
      }
    }
  });

  it("aligns status with calendar day", () => {
    for (const event of events) {
      if (event.date < today) {
        expect(event.status).toBe("completed");
      } else if (event.date > today) {
        expect(["upcoming", "tomorrow"]).toContain(event.status);
      } else {
        expect(["today", "live"]).toContain(event.status);
      }
    }
  });

  it("requires title, type, importance, and enriched intelligence fields", () => {
    for (const event of events) {
      expect(event.title.trim().length).toBeGreaterThan(0);
      expect(event.eventType).toBeTruthy();
      expect(event.importance).toBeTruthy();
      expect(typeof event.impactScore).toBe("number");
      expect(event.impactScore!).toBeGreaterThanOrEqual(0);
      expect(event.impactScore!).toBeLessThanOrEqual(100);
      expect(typeof event.confidence).toBe("number");
      expect(event.confidence!).toBeGreaterThanOrEqual(0);
      expect(event.confidence!).toBeLessThanOrEqual(100);
      expect((event.aiSummary ?? "").trim().length).toBeGreaterThan(0);
      expect((event.preparationChecklist ?? []).length).toBeGreaterThan(0);
    }
  });

  it("maps timeline buckets correctly", () => {
    expect(timelineBucket(today, today)).toBe("today");
    const tomorrow = events.find((e) => e.status === "tomorrow")?.date;
    if (tomorrow) expect(timelineBucket(tomorrow, today)).toBe("tomorrow");
    const past = events.find((e) => e.date < today);
    if (past) expect(timelineBucket(past.date, today)).toBe("past");
    const future = events.find(
      (e) => e.date > today && e.status === "upcoming"
    );
    if (future) expect(timelineBucket(future.date, today)).toBe("future");
  });

  it("filters and views stay consistent", () => {
    const empty = createEmptyEventFilters();
    const all = filterEvents(events, empty, "", today);
    expect(all.length).toBe(events.length);

    const upcoming = filterEvents(
      events,
      { ...empty, quickRanges: ["upcoming"] },
      "",
      today
    );
    for (const event of upcoming) {
      expect(event.date >= today).toBe(true);
      expect(event.status).not.toBe("completed");
    }

    const day = eventsForView(events, "day", today);
    for (const event of day) expect(event.date).toBe(today);

    const searchHit = filterEvents(events, empty, "RBI", today);
    expect(searchHit.length).toBeGreaterThan(0);
  });

  it("covers earnings, corporate actions, and macro repositories", () => {
    expect(
      events.some(
        (e) =>
          e.eventType === "quarterly_results" ||
          e.eventType === "annual_results"
      )
    ).toBe(true);
    expect(events.some((e) => e.corporateActionDetail != null)).toBe(true);
    expect(events.some((e) => e.macroDetail != null)).toBe(true);
    expect(
      events.some(
        (e) =>
          e.macroDetail?.theme === "central_bank" &&
          e.title.toLowerCase().includes("rbi")
      )
    ).toBe(true);
    expect(
      events.some(
        (e) =>
          e.macroDetail?.theme === "central_bank" &&
          (e.title.toLowerCase().includes("fed") ||
            e.title.toLowerCase().includes("fomc"))
      )
    ).toBe(true);
  });
});
