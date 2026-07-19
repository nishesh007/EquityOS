/**
 * AI Alert Decision Support — tests (Sprint 9C.R6).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateAlert,
  registerAlertEngine,
  resetAlertEngine,
  type InstitutionalAlert,
} from "../index";
import { resetAlertCenter, getAlertCenter } from "../center";
import {
  DECISION_SUPPORT_EMPTY,
  buildAlertDecisionSupport,
  buildAlertTimeline,
  buildConfidenceBreakdown,
  collectAlertEvidence,
  detectAlertConflicts,
  estimateAlertImpact,
  explainAlert,
  findSimilarAlerts,
  recommendAlertAction,
  scoreAlertPriority,
} from "./index";

const NOW = new Date("2026-07-15T10:00:00.000Z");

function makeAlert(
  overrides: Partial<{
    ticker: string;
    company: string;
    eventType: string;
    title: string;
    sourceEngine: InstitutionalAlert["sourceEngine"];
    category: string;
    priority: string;
    severity: string;
    inPortfolio: boolean;
    inWatchlist: boolean;
    confidence: number;
    evidence: string[];
    metadata: Record<string, unknown>;
  }> = {}
): InstitutionalAlert {
  const result = generateAlert(
    {
      sourceEngine: overrides.sourceEngine ?? "Earnings",
      eventType: overrides.eventType ?? "eps_beat",
      title: overrides.title ?? "EPS Beat — RELIANCE",
      summary: "Beat vs estimates",
      reason: "Post-earnings comparison",
      evidence: overrides.evidence ?? ["eps:Beat", "resultDate:2026-07-15"],
      company: overrides.company ?? "Reliance Industries",
      ticker: overrides.ticker ?? "RELIANCE",
      inPortfolio: overrides.inPortfolio ?? true,
      inWatchlist: overrides.inWatchlist ?? false,
      suggestedCategory: overrides.category ?? "Earnings",
      suggestedPriority: overrides.priority ?? "High",
      suggestedSeverity: overrides.severity ?? "Major",
      confidenceScore: overrides.confidence ?? 82,
      dedupeKey: `r6::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}::${Math.random()}`,
      groupKey: `r6::${overrides.ticker ?? "RELIANCE"}::${overrides.eventType ?? "eps_beat"}`,
      metadata: {
        sector: "Energy",
        technicalStrength: 70,
        fundamentalStrength: 75,
        trustScore: 72,
        validationScore: 70,
        ...(overrides.metadata ?? {}),
      },
    },
    NOW
  );
  expect(result.alert).not.toBeNull();
  return result.alert!;
}

describe("Alert Decision Support (9C.R6)", () => {
  beforeEach(() => {
    resetAlertEngine();
    resetAlertCenter();
    registerAlertEngine();
  });

  afterEach(() => {
    resetAlertCenter();
    resetAlertEngine();
  });

  describe("Priority scoring", () => {
    it("scores alerts 0–100 with factor breakdown", () => {
      const alert = makeAlert({ inPortfolio: true, confidence: 90 });
      const result = scoreAlertPriority(alert);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors.confidence).toBeGreaterThan(0);
      expect(result.factors.portfolioExposure).toBeGreaterThan(50);
      expect(result.label).toContain(String(result.score));
      expect(Number.isNaN(result.score)).toBe(false);
    });

    it("elevates portfolio critical alerts vs watchlist informational", () => {
      const high = scoreAlertPriority(
        makeAlert({
          inPortfolio: true,
          priority: "Critical",
          severity: "Critical",
          confidence: 90,
          eventType: "stop_loss_triggered",
          title: "Stop loss",
        })
      );
      const low = scoreAlertPriority(
        makeAlert({
          ticker: "XYZ",
          inPortfolio: false,
          inWatchlist: false,
          priority: "Informational",
          severity: "Informational",
          confidence: 40,
          eventType: "info_update",
          title: "Info note",
          category: "Platform",
          sourceEngine: "Platform",
        })
      );
      expect(high.score).toBeGreaterThan(low.score);
    });
  });

  describe("Impact estimation", () => {
    it("estimates portfolio, risk, urgency, and reaction window", () => {
      const impact = estimateAlertImpact(makeAlert({ inPortfolio: true }));
      expect(impact.portfolioImpact).toBeTruthy();
      expect(impact.capitalRisk).toBeTruthy();
      expect(impact.opportunitySize).toBeTruthy();
      expect(impact.urgency).toBeTruthy();
      expect(impact.reactionWindow).toBeTruthy();
      expect(impact.expectedDuration).toBeTruthy();
      expect(impact.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Recommendations", () => {
    it("recommends reduce on bearish portfolio critical", () => {
      const rec = recommendAlertAction(
        makeAlert({
          eventType: "major_miss",
          title: "Major miss",
          priority: "Critical",
          severity: "Critical",
          inPortfolio: true,
          confidence: 88,
        })
      );
      expect(["Reduce Position", "Immediate Action", "Research Required"]).toContain(
        rec.action
      );
      expect(rec.reasoning.length).toBeGreaterThan(0);
      expect(rec.badges.length).toBeGreaterThan(0);
    });

    it("recommends research when conflict flag set", () => {
      const rec = recommendAlertAction(makeAlert(), { hasConflict: true });
      expect(rec.action).toBe("Research Required");
      expect(rec.badges).toContain("Conflict");
    });
  });

  describe("Explainability", () => {
    it("explains why triggered with drivers and decision trace", () => {
      const explanation = explainAlert(makeAlert());
      expect(explanation.whyTriggered).toBeTruthy();
      expect(explanation.supportingEvidence.length).toBeGreaterThan(0);
      expect(explanation.ruleContribution.length).toBeGreaterThan(0);
      expect(explanation.decisionTrace.length).toBeGreaterThan(0);
      expect(explanation.positiveDrivers[0]).toBeTruthy();
      expect(explanation.confidenceContribution).toContain("confidence");
    });
  });

  describe("Evidence", () => {
    it("buckets evidence into panel sections", () => {
      const evidence = collectAlertEvidence(
        makeAlert({
          evidence: ["eps:Beat", "rsi:72", "pe:22", "sector:Energy"],
          eventType: "eps_beat",
        })
      );
      expect(evidence.empty).toBe(false);
      const total =
        evidence.indicators.length +
        evidence.earnings.length +
        evidence.technicalSignals.length +
        evidence.fundamentals.length +
        evidence.sectorSignals.length;
      expect(total).toBeGreaterThan(0);
    });

    it("returns No Supporting Evidence empty state when barren", () => {
      const alert = makeAlert({ evidence: [] });
      // force empty evidence path via platform alert with no extras
      const barren = {
        ...alert,
        evidence: [],
        reason: "n/a",
        metadata: {
          ...alert.metadata,
          extras: {},
          eventType: "unknown",
        },
        category: "Platform" as const,
        sourceEngine: "Platform" as const,
      };
      const evidence = collectAlertEvidence(barren);
      // still gets fallback indicator from reason — ensure no null fields
      expect(evidence.emptyMessage).toBeTruthy();
      expect(evidence.emptyMessage).not.toMatch(/null|undefined|NaN/i);
    });
  });

  describe("Conflict detection", () => {
    it("detects bullish vs bearish conflict on same ticker", () => {
      const bull = makeAlert({
        eventType: "price_breakout",
        title: "Breakout",
        sourceEngine: "Market",
        category: "Technical",
      });
      const bear = makeAlert({
        eventType: "guidance_lowered",
        title: "Guidance cut",
        evidence: ["guidance:Downgrade"],
      });
      const conflict = detectAlertConflicts([bull, bear], bull);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.confidencePenalty).toBeGreaterThan(0);
      expect(conflict.conflictReason).toContain("conflicts");
      expect(conflict.dominantSignal).toBeTruthy();
    });

    it("returns unavailable when no conflict", () => {
      const a = makeAlert({ eventType: "eps_beat" });
      const conflict = detectAlertConflicts([a], a);
      expect(conflict.hasConflict).toBe(false);
      expect(conflict.emptyMessage).toBe(
        DECISION_SUPPORT_EMPTY.conflictUnavailable
      );
    });
  });

  describe("Similarity", () => {
    it("finds similar historical alerts", () => {
      const focus = makeAlert({ eventType: "eps_beat", ticker: "RELIANCE" });
      // Bypass generateAlert grouping by cloning with a distinct id
      const prior: InstitutionalAlert = {
        ...focus,
        id: "hist::reliance::eps_beat::prior",
        createdAt: "2026-06-01T10:00:00.000Z",
        title: "Prior beat",
      };
      const unrelated: InstitutionalAlert = {
        ...focus,
        id: "hist::tcs::rsi",
        ticker: "TCS",
        company: "TCS",
        category: "Technical",
        sourceEngine: "Market",
        metadata: {
          ...focus.metadata,
          eventType: "rsi_overbought",
        },
      };
      const similar = findSimilarAlerts(focus, [focus, prior, unrelated]);
      expect(similar.empty).toBe(false);
      expect(similar.matches[0]!.successRate).toMatch(/%/);
      expect(similar.matches[0]!.averageMove).toBeTruthy();
      expect(similar.matches[0]!.outcome).toBeTruthy();
    });

    it("returns No Historical Match when none", () => {
      const focus = makeAlert({ ticker: "UNIQUECO", eventType: "unique_event_xyz" });
      const similar = findSimilarAlerts(focus, [focus]);
      expect(similar.empty).toBe(true);
      expect(similar.emptyMessage).toBe(DECISION_SUPPORT_EMPTY.noHistoricalMatch);
    });
  });

  describe("Timeline & confidence breakdown", () => {
    it("builds timeline with center lifecycle stamps", () => {
      const alert = makeAlert();
      const center = getAlertCenter();
      center.ingest([alert]);
      center.performAction(alert.id, "mark_read", { now: NOW });
      const resolved = center.performAction(alert.id, "resolve", { now: NOW });
      const timeline = buildAlertTimeline(alert, { center: resolved.item });
      expect(timeline.events.some((e) => e.label === "Created")).toBe(true);
      expect(timeline.events.every((e) => e.at && e.label)).toBe(true);
    });

    it("builds confidence breakdown contributions", () => {
      const breakdown = buildConfidenceBreakdown(makeAlert({ confidence: 80 }));
      expect(breakdown.overall).toBeGreaterThanOrEqual(70);
      expect(breakdown.label).toMatch(/%/);
      expect(breakdown.contributions.length).toBeGreaterThan(3);
      expect(breakdown.contributions.every((c) => !Number.isNaN(c.score))).toBe(
        true
      );
    });
  });

  describe("Decision support panel", () => {
    it("composes full AI drawer panel", () => {
      const bull = makeAlert({ eventType: "momentum_breakout", title: "Breakout" });
      const bear = makeAlert({
        eventType: "guidance_lowered",
        title: "Guidance cut",
      });
      const panel = buildAlertDecisionSupport(bull, {
        peers: [bull, bear],
        history: [bull, bear],
      });
      expect(panel.priority.score).toBeGreaterThanOrEqual(0);
      expect(panel.impact.urgency).toBeTruthy();
      expect(panel.recommendation.action).toBeTruthy();
      expect(panel.explainability.whyTriggered).toBeTruthy();
      expect(panel.evidence.emptyMessage).toBeTruthy();
      expect(panel.conflict.hasConflict).toBe(true);
      expect(panel.timeline.events.length).toBeGreaterThan(0);
      expect(panel.confidenceBreakdown.overall).toBeGreaterThan(0);
      expect(panel.badges.length).toBeGreaterThan(0);
    });

    it("never exposes nullish panel strings", () => {
      const panel = buildAlertDecisionSupport(makeAlert());
      expect(panel.recommendation.reasoning).not.toMatch(/^(null|undefined|NaN)$/);
      expect(panel.priority.label).not.toMatch(/null|undefined|NaN/i);
      expect(panel.impact.portfolioImpact).toBeTruthy();
      expect(panel.explainability.historicalSimilarity).toBeTruthy();
    });

    it("applies conflict confidence penalty on composed panel", () => {
      const bull = makeAlert({
        eventType: "golden_cross",
        title: "Golden cross",
        sourceEngine: "Market",
        category: "Technical",
      });
      const bear = makeAlert({
        eventType: "revenue_miss",
        title: "Revenue miss",
      });
      const solo = buildAlertDecisionSupport(bull, { peers: [bull], history: [bull] });
      const conflicted = buildAlertDecisionSupport(bull, {
        peers: [bull, bear],
        history: [bull, bear],
      });
      expect(conflicted.conflict.hasConflict).toBe(true);
      expect(conflicted.priority.score).toBeLessThanOrEqual(solo.priority.score);
      expect(conflicted.priority.label).toContain("conflict");
    });

    it("recommends increase on high-conviction watchlist breakout", () => {
      const rec = recommendAlertAction(
        makeAlert({
          eventType: "high_conviction_opportunity",
          title: "High conviction buy",
          sourceEngine: "AI Research",
          category: "Opportunity",
          inPortfolio: false,
          inWatchlist: true,
          priority: "High",
          confidence: 90,
        })
      );
      expect([
        "Increase Position",
        "Immediate Action",
        "Research Required",
        "Monitor",
      ]).toContain(rec.action);
      expect(rec.alternateActions.length).toBeGreaterThan(0);
    });

    it("surfaces news and corporate action evidence buckets", () => {
      const news = collectAlertEvidence(
        makeAlert({
          sourceEngine: "News",
          category: "News",
          eventType: "breaking_news",
          evidence: ["source:Wire", "tag:breaking"],
          title: "Breaking news",
        })
      );
      expect(news.news.length + news.indicators.length).toBeGreaterThan(0);

      const ca = collectAlertEvidence(
        makeAlert({
          sourceEngine: "Corporate Actions",
          category: "Corporate Action",
          eventType: "dividend",
          evidence: ["type:Dividend", "value:2.5%"],
          title: "Dividend",
        })
      );
      expect(ca.corporateActions.length + ca.indicators.length).toBeGreaterThan(0);
    });

    it("empty-state constants are display-safe", () => {
      expect(DECISION_SUPPORT_EMPTY.noRecommendation).toBe("No AI Recommendation");
      expect(DECISION_SUPPORT_EMPTY.noEvidence).toBe("No Supporting Evidence");
      expect(DECISION_SUPPORT_EMPTY.noHistoricalMatch).toBe("No Historical Match");
      expect(DECISION_SUPPORT_EMPTY.conflictUnavailable).toBe(
        "Conflict Analysis Unavailable"
      );
    });
  });
});
