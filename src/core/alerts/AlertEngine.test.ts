/**
 * Institutional AI Alert Engine — unit tests (Sprint 9C.R1).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ALERT_CATEGORIES,
  ALERT_ENGINE_EMPTY,
  ALERT_LIFECYCLE_STATES,
  ALERT_PRIORITIES,
  ALERT_SEVERITIES,
  ALERT_SOURCE_ENGINES,
  archiveAlert,
  calculateAlertConfidence,
  calculateAlertPriority,
  calculateAlertSeverity,
  canTransitionLifecycle,
  createAlertFromEvent,
  dismissAlert,
  evaluateAlertRules,
  expireAlert,
  generateAlert,
  getAlertEngine,
  getAlertMetrics,
  getAlerts,
  getMetrics,
  getSource,
  isActiveLifecycle,
  listAlertSources,
  listSources,
  registerAlertEngine,
  registerAlertSource,
  registerBuiltinSources,
  registerSource,
  resetAlertEngine,
  resolveAlertConfidence,
  type AlertSourceEvent,
} from "./index";
import { buildAlertContext } from "./AlertContext";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function baseEvent(
  overrides: Partial<AlertSourceEvent> = {}
): AlertSourceEvent {
  return {
    sourceEngine: "Earnings",
    eventType: "upcoming_earnings",
    title: "RELIANCE earnings tomorrow",
    summary: "Results expected with elevated attention",
    description: "Institutional earnings event for RELIANCE",
    reason: "Calendar countdown within window",
    evidence: ["calendar", "dashboard scorecard"],
    company: "Reliance Industries",
    ticker: "RELIANCE",
    inPortfolio: true,
    inWatchlist: false,
    confidenceScore: 72,
    ...overrides,
  };
}

describe("Institutional AI Alert Engine (9C.R1)", () => {
  beforeEach(() => {
    resetAlertEngine();
    registerAlertEngine();
  });

  afterEach(() => {
    resetAlertEngine();
  });

  describe("Registry", () => {
    it("registers all builtin alert sources", () => {
      const result = registerBuiltinSources();
      expect(result.total).toBe(ALERT_SOURCE_ENGINES.length);
      expect(listSources().length).toBe(ALERT_SOURCE_ENGINES.length);
      expect(getSource("Earnings")?.enabled).toBe(true);
      expect(getSource("Screener")?.label).toContain("Screener");
    });

    it("registerSource is idempotent", () => {
      const first = registerSource({
        sourceId: "News",
        label: "News",
        description: "News",
        defaultCategory: "News",
        weight: 0.9,
        enabled: true,
      });
      expect(first.skipped).toBe(true); // already builtin
      const custom = registerAlertSource({
        sourceId: "Platform",
        label: "Platform Override",
        description: "Override",
        defaultCategory: "Platform",
        weight: 1,
        enabled: true,
      });
      expect(custom.skipped).toBe(true);
      const forced = registerSource(
        {
          sourceId: "Platform",
          label: "Platform Forced",
          description: "Forced",
          defaultCategory: "Platform",
          weight: 1,
          enabled: true,
        },
        { force: true }
      );
      expect(forced.registered).toBe(true);
      expect(getSource("Platform")?.label).toBe("Platform Forced");
    });

    it("lists sources via public API", () => {
      expect(listAlertSources().length).toBeGreaterThan(0);
    });
  });

  describe("Alert generation", () => {
    it("generates a scored institutional alert", () => {
      const result = generateAlert(baseEvent(), NOW);
      expect(result.created).toBe(true);
      expect(result.alert).not.toBeNull();
      expect(result.alert!.sourceEngine).toBe("Earnings");
      expect(result.alert!.category).toBe("Earnings");
      expect(result.alert!.ticker).toBe("RELIANCE");
      expect(result.alert!.inPortfolio).toBe(true);
      expect(result.alert!.status).toBe("Active");
      expect(result.alert!.title).toBe("RELIANCE earnings tomorrow");
      expect(result.alert!.confidence.available).toBe(true);
      expect(result.emptyMessage).toBe("");
    });

    it("never exposes null / undefined / NaN text fields", () => {
      const result = generateAlert(
        baseEvent({
          title: null,
          summary: undefined,
          description: "NaN",
          reason: "null",
          company: "",
          evidence: [null as unknown as string, "valid", "undefined"],
        }),
        NOW
      );
      expect(result.alert).not.toBeNull();
      const a = result.alert!;
      expect(a.title).not.toMatch(/^(null|undefined|NaN)?$/);
      expect(a.summary.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.reason.length).toBeGreaterThan(0);
      expect(a.company.length).toBeGreaterThan(0);
      expect(a.evidence).toEqual(["valid"]);
      expect(Number.isNaN(a.confidence.score)).toBe(false);
    });
  });

  describe("Priority / Severity / Confidence", () => {
    it("calculates priority with portfolio boost", () => {
      const event = baseEvent({
        suggestedPriority: undefined,
        eventType: "major_miss",
        title: "Major miss alert",
        inPortfolio: true,
      });
      const ctx = buildAlertContext(event, { now: NOW });
      const priority = calculateAlertPriority(event, ctx, "Earnings");
      expect(ALERT_PRIORITIES).toContain(priority);
      expect(["Critical", "High"]).toContain(priority);
    });

    it("calculates severity aligned to priority", () => {
      const event = baseEvent({ eventType: "info_update", title: "Info note" });
      const ctx = buildAlertContext(event, { now: NOW });
      const priority = calculateAlertPriority(event, ctx, "Earnings");
      const severity = calculateAlertSeverity(event, ctx, priority);
      expect(ALERT_SEVERITIES).toContain(severity);
    });

    it("calculates confidence with evidence boost", () => {
      const thin = calculateAlertConfidence(
        baseEvent({ evidence: [], confidenceScore: 50, inPortfolio: false }),
        buildAlertContext(
          baseEvent({ evidence: [], confidenceScore: 50, inPortfolio: false }),
          { now: NOW }
        )
      );
      const rich = calculateAlertConfidence(
        baseEvent({
          evidence: ["a", "b", "c"],
          confidenceScore: 50,
          inPortfolio: true,
        }),
        buildAlertContext(
          baseEvent({
            evidence: ["a", "b", "c"],
            confidenceScore: 50,
            inPortfolio: true,
          }),
          { now: NOW }
        )
      );
      expect(rich.score).toBeGreaterThan(thin.score);
      expect(resolveAlertConfidence(null).level).toBe("Unavailable");
      expect(resolveAlertConfidence(Number.NaN).available).toBe(false);
    });

    it("evaluateAlertRules returns complete evaluation", () => {
      const event = baseEvent({ suggestedSeverity: "Major" });
      const evaluation = evaluateAlertRules(
        event,
        buildAlertContext(event, { now: NOW })
      );
      expect(ALERT_CATEGORIES).toContain(evaluation.category);
      expect(evaluation.severity).toBe("Major");
      expect(evaluation.dedupeKey.length).toBeGreaterThan(0);
      expect(evaluation.groupKey.length).toBeGreaterThan(0);
    });
  });

  describe("Deduplication & Grouping", () => {
    it("deduplicates identical events", () => {
      const event = baseEvent({
        dedupeKey: "earn::RELIANCE::upcoming",
        groupKey: "earn::RELIANCE",
      });
      const first = generateAlert(event, NOW);
      const second = generateAlert(event, NOW);
      expect(first.created).toBe(true);
      expect(second.deduplicated).toBe(true);
      expect(second.created).toBe(false);
      expect(second.alert!.id).toBe(first.alert!.id);
      expect(getMetrics().deduplicated).toBeGreaterThanOrEqual(1);
    });

    it("groups related events under the same group key", () => {
      const first = generateAlert(
        baseEvent({
          dedupeKey: "earn::RELIANCE::upcoming",
          groupKey: "earn::RELIANCE",
          title: "Upcoming earnings",
        }),
        NOW
      );
      const second = generateAlert(
        baseEvent({
          dedupeKey: "earn::RELIANCE::reminder",
          groupKey: "earn::RELIANCE",
          title: "Today reminder",
          eventType: "today_reminder",
          suggestedPriority: "High",
        }),
        NOW
      );
      expect(first.created).toBe(true);
      expect(second.grouped).toBe(true);
      expect(second.alert!.metadata.groupedCount).toBeGreaterThanOrEqual(2);
      expect(getMetrics().grouped).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Lifecycle", () => {
    it("supports Generated → Active → Dismissed → Archived", () => {
      expect(canTransitionLifecycle("Generated", "Active")).toBe(true);
      expect(canTransitionLifecycle("Active", "Dismissed")).toBe(true);
      expect(canTransitionLifecycle("Dismissed", "Archived")).toBe(true);
      expect(canTransitionLifecycle("Archived", "Active")).toBe(false);
      expect(ALERT_LIFECYCLE_STATES).toContain("Viewed");

      const created = generateAlert(baseEvent(), NOW).alert!;
      expect(isActiveLifecycle(created.status)).toBe(true);

      const dismissed = dismissAlert(created.id);
      expect(dismissed?.status).toBe("Dismissed");

      const archived = archiveAlert(created.id);
      expect(archived?.status).toBe("Archived");
    });

    it("expires alerts past expiry", () => {
      const created = generateAlert(
        baseEvent({
          expiresAt: new Date(NOW.getTime() - 60_000).toISOString(),
          dedupeKey: "expire-test",
        }),
        NOW
      ).alert!;

      // Force-expire via API (already past expiry on next get)
      const expired = expireAlert(created.id, NOW);
      expect(expired?.status).toBe("Expired");
      expect(getMetrics().expired).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Cache", () => {
    it("caches generated alerts for reuse", () => {
      const result = generateAlert(
        baseEvent({ dedupeKey: "cache-key-1" }),
        NOW
      );
      const stats = getAlertEngine().getCacheStats();
      expect(stats.writes).toBeGreaterThanOrEqual(1);
      expect(getAlertEngine().getAlert(result.alert!.id)?.id).toBe(
        result.alert!.id
      );
      const after = getAlertEngine().getCacheStats();
      expect(after.hits).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Metrics & Public API", () => {
    it("tracks generated / active / dismissed metrics", () => {
      const a = generateAlert(baseEvent({ dedupeKey: "m1" }), NOW).alert!;
      generateAlert(
        baseEvent({
          sourceEngine: "Trust",
          eventType: "trust_drop",
          title: "Trust decline",
          ticker: "INFY",
          dedupeKey: "m2",
          groupKey: "trust::INFY",
        }),
        NOW
      );
      dismissAlert(a.id);
      const metrics = getAlertMetrics();
      expect(metrics.generated).toBeGreaterThanOrEqual(2);
      expect(metrics.dismissed).toBeGreaterThanOrEqual(1);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
      expect(metrics.averageProcessingTimeMs).toBeGreaterThanOrEqual(0);
      expect(getMetrics().generated).toBe(metrics.generated);
    });

    it("getAlerts returns empty states without null", () => {
      const empty = getAlerts();
      expect(empty.empty).toBe(true);
      expect([
        ALERT_ENGINE_EMPTY.noAlerts,
        ALERT_ENGINE_EMPTY.awaitingEvents,
        ALERT_ENGINE_EMPTY.noActive,
      ]).toContain(empty.emptyMessage);
      expect(empty.alerts).toEqual([]);

      generateAlert(baseEvent(), NOW);
      const filled = getAlerts({ sourceEngine: "Earnings" });
      expect(filled.empty).toBe(false);
      expect(filled.total).toBeGreaterThan(0);
      expect(filled.alerts[0]!.priority).toBeTruthy();
    });

    it("factory createAlertFromEvent suppresses empty payloads", () => {
      const out = createAlertFromEvent({
        event: {
          sourceEngine: "Platform",
          eventType: "",
          title: null,
          summary: null,
        },
        now: NOW,
      });
      expect(out.suppressed).toBe(true);
      expect(out.alert).toBeNull();
    });
  });

  describe("Regression — multi-source ingestion", () => {
    it("ingests events from research, earnings, validation, and trust", () => {
      const sources: AlertSourceEvent[] = [
        baseEvent({
          sourceEngine: "AI Research",
          eventType: "opportunity",
          title: "High conviction setup",
          ticker: "TCS",
          suggestedCategory: "Opportunity",
          dedupeKey: "res::TCS",
          groupKey: "res::TCS",
        }),
        baseEvent({
          sourceEngine: "Validation",
          eventType: "validation_fail",
          title: "Critical validation breach",
          ticker: "HDFCBANK",
          dedupeKey: "val::HDFCBANK",
          groupKey: "val::HDFCBANK",
        }),
        baseEvent({
          sourceEngine: "Trust",
          eventType: "trust_reject",
          title: "Trust rejection",
          ticker: "WIPRO",
          dedupeKey: "trust::WIPRO",
          groupKey: "trust::WIPRO",
        }),
        baseEvent({
          sourceEngine: "Portfolio",
          eventType: "exposure_alert",
          title: "Portfolio concentration risk",
          ticker: "RELIANCE",
          dedupeKey: "port::RELIANCE",
          groupKey: "port::RELIANCE",
        }),
      ];

      for (const event of sources) {
        const result = generateAlert(event, NOW);
        expect(result.created || result.grouped || result.deduplicated).toBe(
          true
        );
        expect(result.alert).not.toBeNull();
      }

      const all = getAlerts({ includeTerminal: true });
      expect(all.total).toBeGreaterThanOrEqual(4);
      const engines = new Set(all.alerts.map((a) => a.sourceEngine));
      expect(engines.has("AI Research")).toBe(true);
      expect(engines.has("Validation")).toBe(true);
      expect(engines.has("Trust")).toBe(true);
      expect(engines.has("Portfolio")).toBe(true);
    });
  });
});
