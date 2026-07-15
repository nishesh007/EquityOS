/**
 * Institutional Post Earnings Analysis — unit tests (Sprint 9B.R3).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  normalizeCalendarSeed,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import {
  compareEstimateVsActual,
  getGuidanceSummary,
  getMarketReaction,
  getPostEarningsAnalysis,
  getPostEarningsEngine,
  getPostEarningsVerdict,
  POST_EARNINGS_EMPTY,
  postBadgeVariant,
  resetPostEarningsEngine,
  toPostEarningsCardView,
} from "./index";

describe("Post Earnings Analysis", () => {
  beforeEach(() => {
    resetEarningsCalendarService();
    resetPostEarningsEngine();
    getEarningsCalendarService({
      seed: DEFAULT_EARNINGS_CALENDAR_SEED,
      universeSize: 50,
    });
  });

  afterEach(() => {
    resetPostEarningsEngine();
    resetEarningsCalendarService();
  });

  it("compares estimate vs actual with beat/miss labels", () => {
    const comparison = compareEstimateVsActual("RELIANCE");
    expect(comparison.available).toBe(true);
    expect(comparison.revenue.actual).toBeTruthy();
    expect(comparison.revenue.estimate).toBeTruthy();
    expect(comparison.eps.beatPercent).toBeTruthy();
    expect([
      "Strong Beat",
      "Beat",
      "Inline",
      "Miss",
      "Major Miss",
    ]).toContain(comparison.overallOutcome);
    expect(JSON.stringify(comparison)).not.toContain("undefined");
    expect(JSON.stringify(comparison)).not.toContain("NaN");
  });

  it("analyzes guidance upgrade / downgrade / no change", () => {
    const guidance = getGuidanceSummary("TCS");
    expect(guidance.available).toBe(true);
    expect(["Upgrade", "Downgrade", "No Change"]).toContain(guidance.change);
    expect(guidance.previous).toBeTruthy();
    expect(guidance.current).toBeTruthy();
  });

  it("computes market reaction from quote hints", () => {
    const engine = getPostEarningsEngine();
    engine.setQuoteHint("RELIANCE", {
      open: 2950,
      previousClose: 2890,
      price: 2975,
      changePercent: 2.9,
      high: 2990,
      low: 2920,
      volume: 8_500_000,
      deliveryPercent: 52,
    });
    engine.clearCache();
    const reaction = getMarketReaction("RELIANCE");
    expect(reaction.available).toBe(true);
    expect(reaction.gapLabel).toBe("Gap Up");
    expect(reaction.volumeSpike).toBe("Volume Spike");
    expect(reaction.institutionalFlow).toBe("Institutional Buying");
  });

  it("produces AI verdict and confidence", () => {
    const verdict = getPostEarningsVerdict("HDFCBANK");
    expect(verdict.available).toBe(true);
    expect([
      "Very Positive",
      "Positive",
      "Neutral",
      "Negative",
      "Very Negative",
    ]).toContain(verdict.verdict);
    expect(Number(verdict.confidence)).toBeGreaterThan(0);
  });

  it("builds full post-earnings analysis with badges", () => {
    const analysis = getPostEarningsAnalysis("INFY");
    expect(analysis.comparison.available).toBe(true);
    expect(analysis.badges.length).toBeGreaterThan(0);
    expect(analysis.revenueTrend.length).toBeGreaterThan(1);
    expect(analysis.surpriseTrend.length).toBeGreaterThan(0);

    const card = toPostEarningsCardView(analysis);
    expect(card.ready).toBe(true);
    expect(card.verdict).toBeTruthy();
    expect(JSON.stringify(card)).not.toContain("null");
    expect(JSON.stringify(card)).not.toContain("undefined");
  });

  it("maps badge variants for post-earnings badges", () => {
    expect(postBadgeVariant("Strong Beat")).toBe("gain");
    expect(postBadgeVariant("Major Miss")).toBe("loss");
    expect(postBadgeVariant("Inline")).toBe("neutral");
    expect(postBadgeVariant("Guidance Upgrade")).toBe("gain");
    expect(postBadgeVariant("Guidance Cut")).toBe("loss");
  });

  it("builds research drawer report with chart series", () => {
    const drawer = getPostEarningsEngine().getDrawerView("RELIANCE");
    expect(drawer.title).toContain("Post Earnings");
    expect(drawer.report.empty).toBe(false);
    expect(drawer.report.executiveSummary).toContain("RELIANCE");
    expect(drawer.report.biggestPositives.length).toBeGreaterThan(0);
    expect(drawer.report.revenueTrend.length).toBeGreaterThan(1);
    expect(drawer.report.epsTrend.length).toBeGreaterThan(1);
    expect(drawer.report.marginTrend.length).toBeGreaterThan(1);
  });

  it("uses empty states when results are missing", () => {
    const analysis = getPostEarningsAnalysis("TATAMOTORS");
    const card = toPostEarningsCardView(analysis);
    if (!analysis.comparison.available) {
      expect(card.emptyMessage).toMatch(
        /Awaiting Results|Results Not Published/
      );
      expect(analysis.guidance.emptyMessage).toBe(
        POST_EARNINGS_EMPTY.guidanceNotAvailable
      );
    }
    expect(card.verdict).not.toMatch(/null|undefined|NaN/);
  });

  it("caches completed analyses", () => {
    const engine = getPostEarningsEngine();
    const first = engine.getPostEarningsAnalysis("RELIANCE");
    const second = engine.getPostEarningsAnalysis("RELIANCE");
    expect(second).toBe(first);

    const event = normalizeCalendarSeed(
      DEFAULT_EARNINGS_CALENDAR_SEED.find((s) => s.ticker === "TCS")!
    );
    // Force released window for precompute
    const releasedNow = new Date("2026-07-15T12:00:00.000Z");
    engine.clearCache();
    engine.precomputeVisible([event], releasedNow);
    expect(engine.getCached("TCS", event.resultDate)).toBeTruthy();
  });

  it("exposes public API surface", () => {
    expect(getPostEarningsAnalysis("SBIN").ticker).toBe("SBIN");
    expect(compareEstimateVsActual("SBIN").available).toBe(true);
    expect(getGuidanceSummary("SBIN").change).toBeTruthy();
    expect(getMarketReaction("SBIN")).toBeTruthy();
    expect(getPostEarningsVerdict("SBIN").verdict).toBeTruthy();
  });
});
