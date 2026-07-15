/**
 * Institutional Earnings Transcript Intelligence — unit tests (Sprint 9B.R4).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import {
  getCatalysts,
  getExtractedRisks,
  getGuidanceChanges,
  getManagementSentiment,
  getTranscriptDrawerSection,
  getTranscriptIngestionEngine,
  getTranscriptResearch,
  getTranscriptSummary,
  resetTranscriptIntelligence,
  transcriptBadgeVariant,
  TRANSCRIPT_EMPTY,
} from "./index";

describe("Transcript Intelligence", () => {
  beforeEach(() => {
    resetEarningsCalendarService();
    resetTranscriptIntelligence();
    getEarningsCalendarService({
      seed: DEFAULT_EARNINGS_CALENDAR_SEED,
      universeSize: 50,
    });
  });

  afterEach(() => {
    resetTranscriptIntelligence();
    resetEarningsCalendarService();
  });

  it("ingests transcript seeds without reprocessing", () => {
    const engine = getTranscriptIngestionEngine();
    const first = engine.ingest({
      ticker: "RELIANCE",
      resultDate: "2026-07-18",
      quarter: "Q1",
      financialYear: "FY26",
    });
    const second = engine.ingest({
      ticker: "RELIANCE",
      resultDate: "2026-07-18",
    });
    expect(first.source).toBe("seed");
    expect(first.preparedRemarks.length).toBeGreaterThan(40);
    expect(second).toBe(first);
  });

  it("generates transcript summary sections", () => {
    const summary = getTranscriptSummary("TCS");
    expect(summary.available).toBe(true);
    expect(summary.executiveSummary).toContain("TCS");
    expect(summary.topManagementQuotes.length).toBeGreaterThan(0);
    expect(summary.keyBusinessUpdates.length).toBeGreaterThan(0);
    expect(JSON.stringify(summary)).not.toContain("undefined");
    expect(JSON.stringify(summary)).not.toContain("NaN");
  });

  it("calculates management sentiment and confidence facets", () => {
    const sentiment = getManagementSentiment("RELIANCE");
    expect(sentiment.available).toBe(true);
    expect([
      "Very Positive",
      "Positive",
      "Neutral",
      "Negative",
      "Very Negative",
    ]).toContain(sentiment.overall);
    expect(Number(sentiment.confidence)).toBeGreaterThan(0);
    expect(Number(sentiment.managementConfidence)).toBeGreaterThan(0);
  });

  it("extracts guidance changes vs prior quarter baseline", () => {
    const guidance = getGuidanceChanges("HDFCBANK");
    expect(guidance.available).toBe(true);
    expect(guidance.items.length).toBeGreaterThan(0);
    expect(
      guidance.items.every((i) =>
        ["Raised", "Cut", "Maintained", "Not Discussed"].includes(i.direction)
      )
    ).toBe(true);
  });

  it("extracts risks and catalysts", () => {
    const risks = getExtractedRisks("TCS");
    expect(risks.available).toBe(true);
    expect(risks.risks.length).toBeGreaterThan(0);

    const catalysts = getCatalysts("RELIANCE");
    expect(catalysts.available).toBe(true);
    expect(catalysts.catalysts.length).toBeGreaterThan(0);
  });

  it("analyzes analyst Q&A", () => {
    const research = getTranscriptResearch("INFY");
    expect(research.questions.available).toBe(true);
    expect(research.questions.topAnalystQuestions.length).toBeGreaterThan(0);
    expect(research.questions.managementResponses.length).toBeGreaterThan(0);
  });

  it("builds drawer transcript section with badges", () => {
    const section = getTranscriptDrawerSection("LT");
    expect(section.title).toBe("Transcript Intelligence");
    expect(section.research.available).toBe(true);
    expect(section.research.badges.length).toBeGreaterThan(0);
    expect(section.research.aiVerdict).toBeTruthy();
    expect(transcriptBadgeVariant("Guidance Raised")).toBe("gain");
    expect(transcriptBadgeVariant("Guidance Cut")).toBe("loss");
  });

  it("uses empty states when transcript is unavailable", () => {
    const research = getTranscriptResearch("TATAMOTORS");
    expect(research.available).toBe(false);
    expect(research.emptyMessage).toMatch(
      /Transcript Not Available|No Conference Call|Transcript Awaited/
    );
    expect(research.aiVerdict).not.toMatch(/null|undefined|NaN/);
    expect(
      [
        TRANSCRIPT_EMPTY.transcriptNotAvailable,
        TRANSCRIPT_EMPTY.noConferenceCall,
        TRANSCRIPT_EMPTY.transcriptAwaited,
      ].includes(research.emptyMessage as typeof TRANSCRIPT_EMPTY.transcriptNotAvailable)
    ).toBe(true);
  });

  it("caches processed transcript research", () => {
    const first = getTranscriptResearch("WIPRO");
    const second = getTranscriptResearch("WIPRO");
    expect(second).toBe(first);
  });

  it("exposes public API surface", () => {
    expect(getTranscriptSummary("SBIN").available).toBe(true);
    expect(getManagementSentiment("SBIN").overall).toBeTruthy();
    expect(getGuidanceChanges("SBIN").items.length).toBeGreaterThan(0);
    expect(getExtractedRisks("SBIN").risks.length).toBeGreaterThan(0);
    expect(getCatalysts("SBIN").catalysts.length).toBeGreaterThan(0);
    expect(getTranscriptResearch("SBIN").ticker).toBe("SBIN");
  });
});
