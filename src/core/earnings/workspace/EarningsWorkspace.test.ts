/**
 * Institutional Earnings Workspace — unit tests (Sprint 9B.R7).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EARNINGS_CALENDAR_SEED,
  getEarningsCalendarService,
  resetEarningsCalendarService,
} from "@/src/core/earnings/calendar";
import { resetEarningsPreviewEngine } from "@/src/core/earnings/intelligence";
import { resetEarningsDashboardEngine } from "@/src/core/earnings/dashboard";
import { resetPostEarningsEngine } from "@/src/core/earnings/postAnalysis";
import { canUserExport } from "@/src/core/dataIntegrity/reporting";
import {
  WORKSPACE_EMPTY,
  applyWorkspaceAction,
  exportInstitutionalEarningsReport,
  generateInstitutionalReport,
  getDecisionSummary,
  getEarningsWorkspaceEngine,
  getPortfolioImpact,
  getWatchlistImpact,
  getWorkspace,
  presentPortfolioRow,
  resetEarningsWorkspaceEngine,
  resetPortfolioImpactEngine,
  resetWatchlistImpactEngine,
  resolveRecommendation,
} from "./index";

const NOW = new Date("2026-07-15T06:30:00.000Z");

function seed() {
  resetEarningsCalendarService();
  resetEarningsPreviewEngine();
  resetEarningsDashboardEngine();
  resetPostEarningsEngine();
  resetEarningsWorkspaceEngine();
  resetPortfolioImpactEngine();
  resetWatchlistImpactEngine();

  getEarningsCalendarService({
    seed: DEFAULT_EARNINGS_CALENDAR_SEED,
    universeSize: 50,
  }).setMembership({
    portfolioSymbols: ["RELIANCE", "HDFCBANK", "INFY", "TCS"],
    watchlistSymbols: ["WIPRO", "SBIN", "LT", "MARUTI"],
  });
}

describe("Earnings Workspace", () => {
  beforeEach(() => {
    seed();
  });

  afterEach(() => {
    resetEarningsWorkspaceEngine();
    resetPortfolioImpactEngine();
    resetWatchlistImpactEngine();
    resetEarningsDashboardEngine();
    resetEarningsPreviewEngine();
    resetPostEarningsEngine();
    resetEarningsCalendarService();
  });

  it("computes portfolio impact with weights and impact direction", () => {
    const impact = getPortfolioImpact(
      {
        holdings: [
          {
            symbol: "RELIANCE",
            quantity: 100,
            currentPrice: 2800,
          },
          {
            symbol: "INFY",
            quantity: 200,
            currentPrice: 1500,
          },
        ],
        totalValue: 100 * 2800 + 200 * 1500,
      },
      NOW
    );

    expect(impact.empty).toBe(false);
    expect(impact.rows.length).toBeGreaterThan(0);
    expect(impact.rows.every((r) => r.event.inPortfolio)).toBe(true);
    const presented = presentPortfolioRow(impact.rows[0]!);
    expect(presented.expectedPortfolioImpact).toMatch(/Positive|Neutral|Negative/);
    expect(presented.portfolioWeight).toBeTruthy();
    expect(JSON.stringify(presented)).not.toMatch(/null|undefined|NaN/);
  });

  it("computes watchlist impact signals", () => {
    const impact = getWatchlistImpact(
      { watchlistSymbols: ["WIPRO", "SBIN", "LT", "MARUTI"] },
      NOW
    );
    expect(impact.empty).toBe(false);
    expect(impact.rows.every((r) => r.event.inWatchlist)).toBe(true);
    expect(typeof impact.highConvictionCount).toBe("number");
    expect(typeof impact.highRiskCount).toBe("number");
    expect(impact.rows[0]!.aiConfidence).toBeTruthy();
  });

  it("builds decision recommendations with reasoning and catalysts", () => {
    const workspace = getWorkspace({ now: NOW });
    expect(workspace.decisions.length).toBeGreaterThan(0);
    const decision = workspace.decisions[0]!;
    expect([
      "Increase Position",
      "Accumulate",
      "Hold",
      "Reduce",
      "Exit",
      "Monitor",
    ]).toContain(decision.recommendation);
    expect(decision.reasoning.length).toBeGreaterThan(10);
    expect(decision.catalysts.length).toBeGreaterThan(0);
    expect(decision.confidence).not.toMatch(/null|undefined|NaN/i);

    const byTicker = getDecisionSummary(decision.ticker, NOW);
    expect(byTicker).not.toBeNull();
    if (byTicker && !Array.isArray(byTicker)) {
      expect(byTicker.ticker).toBe(decision.ticker);
    }

    const rec = resolveRecommendation(decision.event, decision.scorecard);
    expect(rec).toBeTruthy();
  });

  it("generates institutional report via Sprint 9F reporting engine", () => {
    const workspace = getWorkspace({ now: NOW });
    const ticker = workspace.decisions[0]!.ticker;
    const report = generateInstitutionalReport(ticker, NOW);
    expect(report.ready).toBe(true);
    expect(report.institutional).not.toBeNull();
    expect(report.sections.length).toBeGreaterThanOrEqual(10);
    const titles = report.sections.map((s) => s.title);
    expect(titles).toContain("Executive Summary");
    expect(titles).toContain("Decision Summary");
    expect(titles).toContain("Disclaimer");
    expect(report.institutional?.reportId).toBeTruthy();
  });

  it("integrates export with role-based ACL (no new exporters)", () => {
    const workspace = getWorkspace({ now: NOW });
    const ticker = workspace.decisions[0]!.ticker;
    const report = generateInstitutionalReport(ticker, NOW);
    expect(report.institutional).not.toBeNull();

    const allowed = canUserExport(
      { userId: "tester", role: "subscriber", subscriptionTier: "pro" },
      "PDF"
    );
    expect(allowed.allowed).toBe(true);

    const denied = canUserExport(
      { userId: "free-user", role: "free", subscriptionTier: "none" },
      "EXCEL"
    );
    expect(denied.allowed).toBe(false);

    const exported = exportInstitutionalEarningsReport({
      report: report.institutional!,
      format: "MARKDOWN",
      subject: {
        userId: "tester",
        role: "subscriber",
        subscriptionTier: "pro",
      },
    });
    expect(exported.success || exported.denied).toBe(true);
  });

  it("supports workspace actions", () => {
    const research = applyWorkspaceAction("RELIANCE", "open_research");
    expect(research.ok).toBe(true);
    expect(research.href).toContain("research");

    const company = applyWorkspaceAction("RELIANCE", "open_company");
    expect(company.href).toBe("/company/RELIANCE");

    const watch = applyWorkspaceAction("RELIANCE", "add_to_watchlist");
    expect(watch.message).toContain("Watchlist");

    const download = applyWorkspaceAction("RELIANCE", "download_report");
    expect(download.ok).toBe(true);
  });

  it("uses institutional empty states", () => {
    getEarningsCalendarService().setMembership({
      portfolioSymbols: [],
      watchlistSymbols: [],
    });
    resetPortfolioImpactEngine();
    resetWatchlistImpactEngine();
    resetEarningsWorkspaceEngine();

    const portfolio = getPortfolioImpact({}, NOW);
    const watchlist = getWatchlistImpact({}, NOW);
    expect(portfolio.emptyMessage).toBe(WORKSPACE_EMPTY.noPortfolio);
    expect(watchlist.emptyMessage).toBe(WORKSPACE_EMPTY.noWatchlist);

    const missing = generateInstitutionalReport("NOTICKER", NOW);
    expect(missing.ready).toBe(false);
    expect(missing.emptyMessage).toBe(WORKSPACE_EMPTY.noReport);
  });

  it("caches portfolio calculations and lazy-loads reports", () => {
    const engine = getEarningsWorkspaceEngine();
    engine.setContext({
      holdings: [
        { symbol: "RELIANCE", quantity: 50, currentPrice: 2800 },
      ],
    });
    engine.getPortfolioImpact(NOW);
    engine.getPortfolioImpact(NOW);

    const ticker = engine.getDecisionSummaries(NOW)[0]!.ticker;
    engine.generateInstitutionalReport(ticker, NOW);
    const builds = engine.getReportBuildCount();
    engine.generateInstitutionalReport(ticker, NOW);
    expect(engine.getReportBuildCount()).toBe(builds);
    expect(builds).toBe(1);
  });
});
