/**
 * Institutional AI Earnings Intelligence — unit tests (Sprint 9B.R2).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  normalizeCalendarSeed,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import {
  badgeVariant,
  getAIExpectation,
  getConfidence,
  getEarningsPreview,
  getEarningsPreviewEngine,
  getExpectedSurprise,
  getResearchSummary,
  INTELLIGENCE_EMPTY,
  resetEarningsPreviewEngine,
  toEarningsCardPreviewView,
  toEarningsDrawerView,
} from "./index";

describe("Earnings Intelligence", () => {
  beforeEach(() => {
    resetEarningsCalendarService();
    resetEarningsPreviewEngine();
    getEarningsCalendarService({
      seed: DEFAULT_EARNINGS_CALENDAR_SEED,
      universeSize: 50,
    });
  });

  afterEach(() => {
    resetEarningsPreviewEngine();
    resetEarningsCalendarService();
  });

  it("generates AI preview for covered earnings events", () => {
    const preview = getEarningsPreview("RELIANCE");
    expect(preview.ticker).toBe("RELIANCE");
    expect(["Bullish", "Neutral", "Bearish"]).toContain(preview.outlook);
    expect(preview.expectation.available).toBe(true);
    expect(preview.badges.length).toBeGreaterThan(0);

    const card = toEarningsCardPreviewView(preview);
    expect(card.ready).toBe(true);
    expect(card.outlook).toBeTruthy();
    expect(card.confidence).not.toMatch(/null|undefined|NaN|^0$/);
    expect(JSON.stringify(card)).not.toContain("undefined");
    expect(JSON.stringify(card)).not.toContain("NaN");
  });

  it("computes confidence in 0–100 without exposing bare zero", () => {
    const confidence = getConfidence("HDFCBANK");
    expect(confidence.available).toBe(true);
    expect(confidence.score).toBeGreaterThan(0);
    expect(confidence.score).toBeLessThanOrEqual(100);
    expect(confidence.breakdown.length).toBeGreaterThan(0);
  });

  it("returns AI expectation and expected surprise", () => {
    const expectation = getAIExpectation("INFY");
    expect(expectation.available).toBe(true);
    expect(["Expected Beat", "Inline", "Miss"]).toContain(expectation.revenue);
    expect(["Expand", "Stable", "Compress"]).toContain(expectation.marginTrend);

    const surprise = getExpectedSurprise("TCS");
    expect(surprise.available).toBe(true);
    expect(surprise.historicalBeatRateLabel).toMatch(/Beat Rate|Insufficient/);
  });

  it("builds research summary for drawer sections", () => {
    const research = getResearchSummary("RELIANCE");
    expect(research.empty).toBe(false);
    expect(research.executiveSummary).toContain("RELIANCE");
    expect(research.revenueTrend.length).toBeGreaterThan(1);
    expect(research.epsTrend.length).toBeGreaterThan(1);
    expect(research.marginTrend.length).toBeGreaterThan(1);
    expect(research.bullCase.length).toBeGreaterThan(0);
    expect(research.bearCase.length).toBeGreaterThan(0);
    expect(research.confidenceBreakdown.length).toBeGreaterThan(0);
    expect(research.finalAIOpinion).toBeTruthy();
  });

  it("renders badge variants for intelligence badges", () => {
    expect(badgeVariant("High Conviction")).toBe("gain");
    expect(badgeVariant("Expensive")).toBe("loss");
    expect(badgeVariant("High Impact")).toBe("accent");
    expect(badgeVariant("Portfolio")).toBe("neutral");
  });

  it("builds drawer view model safely", () => {
    const event = normalizeCalendarSeed(
      DEFAULT_EARNINGS_CALENDAR_SEED.find((s) => s.ticker === "RELIANCE")!
    );
    const engine = getEarningsPreviewEngine();
    const drawer = engine.getDrawerView(event);
    expect(drawer.title).toBe("Institutional Earnings Research");
    expect(drawer.preview.ready).toBe(true);
    expect(drawer.research.revenueTrend.length).toBeGreaterThan(0);

    const viaApi = toEarningsDrawerView({
      event,
      snapshot: engine.getEarningsPreview(event),
      research: engine.getResearchSummaryFor(event),
    });
    expect(viaApi.subtitle).toContain("RELIANCE");
  });

  it("uses empty states when historical data is missing", () => {
    const preview = getEarningsPreview("TATAMOTORS");
    const card = toEarningsCardPreviewView(preview);
    // May still have risk/outlook from calendar metadata; research history should be empty-safe
    const research = getResearchSummary("TATAMOTORS");
    if (research.empty) {
      expect(research.emptyMessage).toBe(INTELLIGENCE_EMPTY.insufficientHistory);
    }
    expect(card.historicalBeatRate).not.toMatch(/null|undefined|NaN/);
    expect(card.consensusDirection).not.toMatch(/null|undefined|NaN/);
  });

  it("caches AI previews and only recomputes once per visible key", () => {
    const engine = getEarningsPreviewEngine();
    const first = engine.getEarningsPreview("RELIANCE");
    const second = engine.getEarningsPreview("RELIANCE");
    expect(second).toBe(first);

    const events = getEarningsCalendarService()
      .getUpcomingEarnings()
      .slice(0, 3);
    engine.clearCache();
    engine.precomputeVisible(events);
    expect(engine.getCachedPreview(events[0]!.ticker, events[0]!.resultDate)).toBeTruthy();
  });

  it("exposes public API surface", () => {
    expect(getEarningsPreview("HDFCBANK").ticker).toBe("HDFCBANK");
    expect(getAIExpectation("HDFCBANK").available).toBe(true);
    expect(getExpectedSurprise("HDFCBANK").available).toBe(true);
    expect(getConfidence("HDFCBANK").score).toBeGreaterThan(0);
    expect(getResearchSummary("HDFCBANK").empty).toBe(false);
  });
});
