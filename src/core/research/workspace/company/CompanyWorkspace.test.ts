/**
 * Company Research Workspace — tests (Sprint 10A.R3).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COMPANY_WORKSPACE_EMPTY,
  buildFinancialAnalysisPanel,
  buildQuickActions,
  buildResearchInsightsPanel,
  buildRiskAnalysisPanel,
  buildTechnicalAnalysisPanel,
  buildValuationPanel,
  favoriteCompanyWorkspace,
  getCompanyOverview,
  getCompanyWorkspaceView,
  getResearchPanels,
  normalizeSnapshot,
  openCompanyWorkspace,
  pinCompanyWorkspace,
  refreshCompanyWorkspace,
  resetResearchWorkspace,
  syncWorkspacePanels,
  type CompanyWorkspaceSnapshot,
} from "../index";

function sampleSnapshot(
  overrides?: Partial<CompanyWorkspaceSnapshot>
): CompanyWorkspaceSnapshot {
  return normalizeSnapshot({
    ticker: "INFY",
    name: "Infosys",
    sector: "IT",
    industry: "Software",
    price: 1500,
    changePercent: 1.2,
    marketCap: "₹6.2L Cr",
    description: "IT services",
    financials: {
      revenue: 1.5e11,
      revenueGrowth: 8,
      netProfit: 2.5e10,
      netProfitGrowth: 6,
      operatingMargin: 21,
      netMargin: 16,
      cashFlow: 2e10,
      pe: 24,
      pb: 7,
      evEbitda: 15,
      roe: 28,
      roce: 32,
      debtToEquity: 0.1,
    },
    technicals: {
      trend: "Uptrend",
      momentum: "Positive",
      support: 1450,
      resistance: 1580,
      rsi: 58,
      macd: "Bullish",
      score: 72,
    },
    valuation: {
      pe: 24,
      pb: 7,
      evEbitda: 15,
      dcfFairValue: 1620,
      dcfAvailable: true,
      dcfNote: "Two-stage DCF",
      relativeSummary: "In line with peer median PE",
      fairValue: 1600,
      upsidePercent: 6.5,
    },
    quality: {
      moatVerdict: "Narrow",
      moatScore: 62,
      capitalAllocation: "Disciplined buybacks and dividends",
      roce: 32,
      roe: 28,
      managementQuality: "Strong",
      summary: "Narrow moat from scale and switching costs",
    },
    risk: {
      business: ["Client concentration"],
      financial: ["Currency volatility"],
      valuation: ["Premium multipules"],
      sector: ["Global IT spend cycle"],
      aggregateScore: 42,
      summary: "Moderate institutional risk",
    },
    insights: {
      businessSummary: "Global IT services franchise",
      investmentThesis: "Quality compounder at fair value",
      aiRecommendation: "Accumulate",
      confidence: 74,
      confidenceLabel: "High confidence",
      bullCase: ["Deal wins accelerate"],
      bearCase: ["US banking slowdown"],
      catalysts: ["Large deal pipeline"],
      headwinds: ["Wage inflation"],
      keyTakeaways: ["Prefer dips to accumulate"],
    },
    badges: {
      confidence: "Confidence 74",
      trust: "Trust High",
      validation: "Validation Pass",
    },
    ...overrides,
  });
}

describe("Sprint 10A.R3 — Company Research Workspace", () => {
  beforeEach(() => {
    resetResearchWorkspace();
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("company workspace", () => {
    it("openCompanyWorkspace opens synchronized desk", () => {
      const view = openCompanyWorkspace(sampleSnapshot());
      expect(view.empty).toBe(false);
      expect(view.overview.ticker).toBe("INFY");
      expect(view.panels.length).toBe(7);
      expect(view.sync.ticker).toBe("INFY");
      expect(view.surfaceHints.company).toContain("/company/INFY");
    });

    it("returns No Company Selected when ticker missing", () => {
      const view = openCompanyWorkspace({ ticker: "", name: "x" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(COMPANY_WORKSPACE_EMPTY.noCompanySelected);
    });

    it("refreshCompanyWorkspace updates snapshot", () => {
      openCompanyWorkspace(sampleSnapshot());
      const refreshed = refreshCompanyWorkspace("INFY", {
        ...sampleSnapshot(),
        price: 1555,
        insights: {
          ...sampleSnapshot().insights,
          aiRecommendation: "Hold",
        },
      });
      expect(refreshed.overview.priceLabel).toContain("1555");
      expect(refreshed.overview.aiRecommendation).toBe("Hold");
    });
  });

  describe("panel synchronization", () => {
    it("syncWorkspacePanels updates timeframe, period, filters, context", () => {
      openCompanyWorkspace(sampleSnapshot());
      const synced = syncWorkspacePanels({
        ticker: "INFY",
        timeframe: "3M",
        period: "quarterly",
        filters: { segment: "it" },
        researchContext: "Earnings season",
      });
      expect(synced.sync.timeframe).toBe("3M");
      expect(synced.sync.period).toBe("quarterly");
      expect(synced.sync.filters.segment).toBe("it");
      expect(synced.sync.researchContext).toBe("Earnings season");
      expect(synced.panels.every((p) => p.id)).toBe(true);
    });

    it("all panels share the same company ticker context", () => {
      openCompanyWorkspace(sampleSnapshot());
      const panels = getResearchPanels("INFY");
      expect(panels.map((p) => p.id)).toEqual([
        "overview",
        "financials",
        "technical",
        "valuation",
        "quality",
        "risk",
        "insights",
      ]);
      expect(getCompanyOverview("INFY").ticker).toBe("INFY");
    });
  });

  describe("overview", () => {
    it("exposes business summary, thesis, recommendation, badges", () => {
      openCompanyWorkspace(sampleSnapshot());
      const overview = getCompanyOverview("INFY");
      expect(overview.businessSummary).toContain("IT services");
      expect(overview.investmentThesis).toContain("compounder");
      expect(overview.aiRecommendation).toBe("Accumulate");
      expect(overview.badges.some((b) => b.tone === "trust")).toBe(true);
      expect(overview.stickySummary).toContain("INFY");
    });
  });

  describe("financial panel", () => {
    it("maps revenue profit margins cash flow balance sheet", () => {
      const panel = buildFinancialAnalysisPanel(sampleSnapshot());
      expect(panel.empty).toBe(false);
      expect(panel.rows.some((r) => r.id === "revenue")).toBe(true);
      expect(panel.rows.some((r) => r.id === "profit")).toBe(true);
      expect(panel.rows.some((r) => r.id === "cash_flow")).toBe(true);
      expect(panel.sections.some((s) => s.id === "balance")).toBe(true);
    });

    it("returns No Financial Data when empty bag", () => {
      const empty = buildFinancialAnalysisPanel(
        sampleSnapshot({
          financials: {
            revenue: 0,
            revenueGrowth: 0,
            netProfit: 0,
            netProfitGrowth: 0,
            operatingMargin: 0,
            netMargin: 0,
            cashFlow: 0,
            pe: 0,
            pb: 0,
            evEbitda: 0,
            roe: 0,
            roce: 0,
            debtToEquity: 0,
          },
        })
      );
      expect(empty.emptyMessage).toBe(COMPANY_WORKSPACE_EMPTY.noFinancialData);
    });
  });

  describe("technical panel", () => {
    it("maps trend momentum support resistance indicators", () => {
      const panel = buildTechnicalAnalysisPanel(sampleSnapshot());
      expect(panel.rows.some((r) => r.label === "Trend")).toBe(true);
      expect(panel.rows.some((r) => r.label === "Support")).toBe(true);
      expect(panel.sections.some((s) => s.title === "Indicators")).toBe(true);
    });
  });

  describe("valuation panel", () => {
    it("reuses PE PB EV/EBITDA and DCF fields", () => {
      const panel = buildValuationPanel(sampleSnapshot());
      expect(panel.rows.some((r) => r.id === "pe")).toBe(true);
      expect(panel.rows.some((r) => r.id === "dcf")).toBe(true);
      expect(panel.sections.some((s) => s.id === "relative")).toBe(true);
    });
  });

  describe("risk panel", () => {
    it("lists business financial valuation sector risks", () => {
      const panel = buildRiskAnalysisPanel(sampleSnapshot());
      expect(panel.sections.map((s) => s.id)).toEqual([
        "business",
        "financial",
        "valuation",
        "sector",
      ]);
      expect(panel.sections[0].items[0]).toContain("Client");
    });
  });

  describe("insights panel", () => {
    it("maps bull bear catalysts headwinds takeaways", () => {
      const panel = buildResearchInsightsPanel(sampleSnapshot());
      expect(panel.empty).toBe(false);
      expect(panel.sections.some((s) => s.id === "bull")).toBe(true);
      expect(panel.sections.some((s) => s.id === "takeaways")).toBe(true);
    });
  });

  describe("quick actions", () => {
    it("deep-links to existing module routes", () => {
      const actions = buildQuickActions("INFY");
      expect(actions.find((a) => a.id === "open_earnings")?.href).toContain(
        "/results"
      );
      expect(actions.find((a) => a.id === "open_alerts")?.href).toContain(
        "alerts=1"
      );
      expect(actions.find((a) => a.id === "open_screener")?.href).toContain(
        "/screener"
      );
      expect(actions.find((a) => a.id === "open_portfolio")?.href).toContain(
        "/portfolio"
      );
      expect(actions.find((a) => a.id === "open_watchlist")?.href).toContain(
        "/watchlist"
      );
      expect(actions.find((a) => a.id === "generate_report")?.href).toContain(
        "/ai/research"
      );
      expect(actions.find((a) => a.id === "compare_company")?.enabled).toBe(true);
    });

    it("pin and favorite update workspace view", () => {
      openCompanyWorkspace(sampleSnapshot());
      expect(pinCompanyWorkspace("INFY", true).pinned).toBe(true);
      expect(favoriteCompanyWorkspace("INFY", true).favorite).toBe(true);
    });
  });

  describe("presentation", () => {
    it("never surfaces null undefined NaN in overview labels", () => {
      openCompanyWorkspace(sampleSnapshot());
      const overview = getCompanyOverview("INFY");
      for (const value of [
        overview.priceLabel,
        overview.changeLabel,
        overview.businessSummary,
        overview.aiRecommendation,
      ]) {
        expect(value).not.toBe("null");
        expect(value).not.toBe("undefined");
        expect(value).not.toBe("NaN");
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });

    it("institutional empty copy constants", () => {
      expect(COMPANY_WORKSPACE_EMPTY.noCompanySelected).toBe("No Company Selected");
      expect(COMPANY_WORKSPACE_EMPTY.awaitingAnalysis).toBe("Awaiting Analysis");
      expect(COMPANY_WORKSPACE_EMPTY.noFinancialData).toBe("No Financial Data");
      expect(COMPANY_WORKSPACE_EMPTY.noTechnicalData).toBe("No Technical Data");
      expect(COMPANY_WORKSPACE_EMPTY.noResearchAvailable).toBe(
        "No Research Available"
      );
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => openCompanyWorkspace(null)).not.toThrow();
      expect(() => refreshCompanyWorkspace("")).not.toThrow();
      expect(() => getCompanyOverview(null)).not.toThrow();
      expect(() => getResearchPanels(null)).not.toThrow();
      expect(() =>
        syncWorkspacePanels({ ticker: "" })
      ).not.toThrow();
      expect(() => getCompanyWorkspaceView(null)).not.toThrow();
    });

    it("does not rebuild R1/R2 — desk still opens with panels", () => {
      const view = openCompanyWorkspace(sampleSnapshot({ ticker: "TCS" }));
      expect(view.panels.length).toBe(7);
      expect(view.quickActions.length).toBe(9);
      expect(view.empty).toBe(false);
    });

    it("quality panel exposes moat ROE ROCE management", () => {
      openCompanyWorkspace(sampleSnapshot());
      const quality = getResearchPanels("INFY").find((p) => p.id === "quality");
      expect(quality?.rows.some((r) => r.id === "moat")).toBe(true);
      expect(quality?.rows.some((r) => r.id === "roe")).toBe(true);
      expect(quality?.rows.some((r) => r.id === "roce")).toBe(true);
      expect(quality?.sections.some((s) => s.id === "capital")).toBe(true);
    });

    it("overview panel is sticky with confidence badges", () => {
      openCompanyWorkspace(sampleSnapshot());
      const overviewPanel = getResearchPanels("INFY").find((p) => p.id === "overview");
      expect(overviewPanel?.sticky).toBe(true);
      expect(overviewPanel?.expandable).toBe(true);
      expect(overviewPanel?.badges.some((b) => b.tone === "confidence")).toBe(true);
    });

    it("sync without open returns No Company Selected", () => {
      const view = syncWorkspacePanels({ ticker: "NOPE" });
      expect(view.emptyMessage).toBe(COMPANY_WORKSPACE_EMPTY.noCompanySelected);
    });

    it("normalizeSnapshot strips sentinel ticker strings", () => {
      const snap = normalizeSnapshot({ ticker: "null", name: "Bad" });
      expect(snap.ticker).toBe("");
      expect(normalizeSnapshot(snap).ticker).toBe("");
    });

    it("technical empty message when bag blank", () => {
      const panel = buildTechnicalAnalysisPanel(
        sampleSnapshot({
          technicals: {
            trend: COMPANY_WORKSPACE_EMPTY.noTechnicalData,
            momentum: COMPANY_WORKSPACE_EMPTY.noTechnicalData,
            support: 0,
            resistance: 0,
            rsi: 0,
            macd: "—",
            score: 0,
          },
        })
      );
      expect(panel.emptyMessage).toBe(COMPANY_WORKSPACE_EMPTY.noTechnicalData);
    });

    it("insights empty when no research narratives", () => {
      const panel = buildResearchInsightsPanel(
        sampleSnapshot({
          insights: {
            businessSummary: COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
            investmentThesis: COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
            aiRecommendation: COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
            confidence: 0,
            confidenceLabel: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
            bullCase: [],
            bearCase: [],
            catalysts: [],
            headwinds: [],
            keyTakeaways: [],
          },
        })
      );
      expect(panel.emptyMessage).toBe(COMPANY_WORKSPACE_EMPTY.noResearchAvailable);
    });

    it("reset clears company workspace state", () => {
      openCompanyWorkspace(sampleSnapshot());
      resetResearchWorkspace();
      expect(getCompanyWorkspaceView("INFY").empty).toBe(true);
    });
  });
});
