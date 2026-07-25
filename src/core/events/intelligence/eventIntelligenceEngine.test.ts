/**
 * Event Intelligence Engine — unit tests (Sprint 10D.4).
 */

import { describe, expect, it } from "vitest";
import { buildEventSeedCatalog } from "@/src/core/events/EventSeedData";
import { analyzeEventIntelligence } from "@/src/core/events/intelligence/eventIntelligenceEngine";
import { computeImpactAnalysis } from "@/src/core/events/intelligence/impactScoreEngine";
import { toEventDrawerView } from "@/src/core/events/EventDrawerPresenter";

describe("eventIntelligenceEngine", () => {
  const today = "2026-07-25";
  const events = buildEventSeedCatalog(today);

  it("enriches catalog events with impact and confidence scores", () => {
    expect(events.length).toBeGreaterThan(10);
    expect(events.every((e) => typeof e.impactScore === "number")).toBe(true);
    expect(events.every((e) => typeof e.confidence === "number")).toBe(true);
    expect(events.every((e) => (e.aiSummary?.length ?? 0) > 0)).toBe(true);
    expect(
      events.every((e) => (e.preparationChecklist?.length ?? 0) > 0)
    ).toBe(true);
  });

  it("scores RBI MPC higher than dividend events", () => {
    const rbi = events.find((e) => e.eventType === "rbi_policy");
    const dividend = events.find((e) => e.eventType === "dividend");
    expect(rbi).toBeTruthy();
    expect(dividend).toBeTruthy();
    expect((rbi?.impactScore ?? 0) > (dividend?.impactScore ?? 0)).toBe(true);
    expect((rbi?.impactScore ?? 0) >= 70).toBe(true);
  });

  it("produces explainable impact factor contributions", () => {
    const rbi = events.find((e) => e.eventType === "rbi_policy");
    expect(rbi).toBeTruthy();
    const impact = computeImpactAnalysis(rbi!);
    expect(impact.score).toBeGreaterThanOrEqual(0);
    expect(impact.score).toBeLessThanOrEqual(100);
    expect(impact.factors.length).toBeGreaterThanOrEqual(5);
    expect(impact.factors.every((f) => f.label && f.rationale)).toBe(true);
    const sum = impact.factors.reduce((s, f) => s + f.points, 0);
    expect(Math.abs(sum - impact.score)).toBeLessThanOrEqual(1);
  });

  it("builds full intelligence payload with sector matrix and checklist", () => {
    const fed = events.find((e) => e.eventType === "fed_meeting");
    expect(fed).toBeTruthy();
    const intel = analyzeEventIntelligence(fed!);
    expect(intel.engineVersion).toBe("10D.4");
    expect(intel.executiveSummary.overview.length).toBeGreaterThan(20);
    expect(intel.sectorMatrix.rows.length).toBeGreaterThanOrEqual(13);
    expect(intel.preparationChecklist.items.length).toBeGreaterThan(3);
    expect(["bullish", "bearish", "neutral", "mixed", "unknown"]).toContain(
      intel.marketBias.bias
    );
    expect(["low", "medium", "high", "very_high"]).toContain(intel.risk.rating);
  });

  it("attaches intelligence to drawer view model", () => {
    const cpi = events.find((e) => e.eventType === "cpi");
    expect(cpi).toBeTruthy();
    const view = toEventDrawerView(cpi!, today);
    expect(view.intelligence.impact.score).toBeGreaterThan(0);
    expect(view.intelligence.confidence.score).toBeGreaterThan(0);
    expect(view.intelligence.historicalInsight).not.toBeNull();
  });
});
