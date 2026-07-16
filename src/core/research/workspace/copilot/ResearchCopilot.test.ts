/**
 * Research Copilot — tests (Sprint 10A.R6).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COPILOT_EMPTY,
  askResearchQuestion,
  buildCopilotExplainability,
  buildDecisionAssistant,
  compareResearch,
  createNote,
  createWorkspace,
  generateResearchSummary,
  getResearchRecommendations,
  ingestEvidenceBag,
  openCompanyWorkspace,
  recordConclusion,
  recordMemoryDecision,
  resetResearchWorkspace,
  type CompanyWorkspaceSnapshot,
  normalizeSnapshot,
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
    marketCap: "Large",
    description: "IT services",
    financials: {
      revenue: 150000,
      revenueGrowth: 8,
      netProfit: 25000,
      netProfitGrowth: 6,
      operatingMargin: 21,
      netMargin: 16,
      cashFlow: 20000,
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
      dcfNote: "DCF",
      relativeSummary: "Fair vs peers",
      fairValue: 1600,
      upsidePercent: 6.5,
    },
    quality: {
      moatVerdict: "Narrow",
      moatScore: 62,
      capitalAllocation: "Disciplined",
      roce: 32,
      roe: 28,
      managementQuality: "Strong",
      summary: "Quality franchise",
    },
    risk: {
      business: ["Client concentration"],
      financial: ["FX volatility"],
      valuation: ["Premium multiple"],
      sector: ["IT cycle"],
      aggregateScore: 42,
      summary: "Moderate risk",
    },
    insights: {
      businessSummary: "Global IT services",
      investmentThesis: "Quality compounder",
      aiRecommendation: "Accumulate",
      confidence: 74,
      confidenceLabel: "High confidence",
      bullCase: ["Deal wins"],
      bearCase: ["Slowdown risk"],
      catalysts: ["Large deals"],
      headwinds: ["Wage inflation"],
      keyTakeaways: ["Buy dips"],
    },
    badges: {
      confidence: "Confidence 74",
      trust: "Trust High",
      validation: "Validation Pass",
    },
    ...overrides,
  });
}

describe("Sprint 10A.R6 — AI Research Copilot", () => {
  let workspaceId = "";

  beforeEach(() => {
    resetResearchWorkspace();
    workspaceId = createWorkspace({ name: "Copilot Desk" }).id;
    openCompanyWorkspace(sampleSnapshot());
    ingestEvidenceBag({
      workspaceId,
      ticker: "INFY",
      bull: ["Quality compounder"],
      bear: ["Valuation risk"],
      catalysts: ["Deal pipeline"],
      risks: ["FX headwinds"],
      confidence: ["High conviction"],
    });
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("copilot", () => {
    it("askResearchQuestion returns No Research Question for empty input", () => {
      const answer = askResearchQuestion({ workspaceId, question: "" });
      expect(answer.empty).toBe(true);
      expect(answer.emptyMessage).toBe(COPILOT_EMPTY.noResearchQuestion);
    });

    it("explains confidence using explainability drivers", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "Explain confidence",
        explainability: { confidenceDrivers: ["Validation pass", "Strong ROE"] },
      });
      expect(answer.empty).toBe(false);
      expect(answer.intent).toBe("explain_confidence");
      expect(answer.answer).toContain("Confidence");
    });

    it("explains validation status", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "Explain validation",
        explainability: { validationStatus: "APPROVED · score 88" },
      });
      expect(answer.intent).toBe("explain_validation");
      expect(answer.answer).toContain("APPROVED");
    });

    it("explains risks from evidence", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "What are the key risks?",
      });
      expect(answer.intent).toBe("explain_risks");
      expect(answer.citations.length).toBeGreaterThanOrEqual(1);
    });

    it("summarizes company thesis", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "Summarize company",
      });
      expect(answer.intent).toBe("summarize_company");
      expect(answer.answer).toContain("Infosys");
    });

    it("general question falls back to workspace insights", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "What should I focus on?",
      });
      expect(answer.intent).toBe("general");
      expect(answer.empty).toBe(false);
    });

    it("summarizes sector context", () => {
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        sector: "IT Services",
        question: "Summarize sector outlook",
      });
      expect(answer.intent).toBe("summarize_sector");
      expect(answer.answer).toContain("IT");
    });
  });

  describe("summary", () => {
    it("generateResearchSummary produces executive one-pager", () => {
      const summary = generateResearchSummary({ workspaceId, ticker: "INFY" });
      expect(summary.empty).toBe(false);
      expect(summary.executiveSummary).toContain("Infosys");
      expect(summary.bullCase.length).toBeGreaterThanOrEqual(1);
      expect(summary.bearCase.length).toBeGreaterThanOrEqual(1);
      expect(summary.finalConclusion).toContain("Accumulate");
    });

    it("summary includes catalysts and risks from evidence", () => {
      const summary = generateResearchSummary({ workspaceId, ticker: "INFY" });
      expect(summary.catalysts.length).toBeGreaterThanOrEqual(1);
      expect(summary.risks.length).toBeGreaterThanOrEqual(1);
    });

    it("empty summary uses No AI Summary", () => {
      const summary = generateResearchSummary({ workspaceId, ticker: "ZZZ" });
      expect(summary.empty).toBe(true);
      expect(summary.emptyMessage).toBe(COPILOT_EMPTY.noAiSummary);
    });
  });

  describe("comparison", () => {
    it("compareResearch highlights valuation growth quality momentum differences", () => {
      openCompanyWorkspace(
        sampleSnapshot({
          ticker: "TCS",
          name: "TCS",
          insights: {
            ...sampleSnapshot().insights,
            aiRecommendation: "Hold",
          },
        })
      );
      const view = compareResearch({
        workspaceId,
        leftTicker: "INFY",
        rightTicker: "TCS",
      });
      expect(view.empty).toBe(false);
      expect(view.dimensions.length).toBe(4);
      expect(view.differences.length).toBeGreaterThanOrEqual(1);
    });

    it("empty comparison uses No Comparison", () => {
      const view = compareResearch({ workspaceId, leftTicker: "", rightTicker: "" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(COPILOT_EMPTY.noComparison);
    });
  });

  describe("decision assistant", () => {
    it("buildDecisionAssistant covers buy hold reduce exit watch", () => {
      recordConclusion("INFY", "Accumulate on weakness");
      recordMemoryDecision("INFY", "Added on dip");
      const assistant = buildDecisionAssistant({ workspaceId, ticker: "INFY" });
      expect(assistant.empty).toBe(false);
      expect(assistant.guidance.length).toBe(5);
      expect(assistant.guidance.map((g) => g.id)).toEqual([
        "buy",
        "hold",
        "reduce",
        "exit",
        "watch",
      ]);
      expect(assistant.whatChanged).not.toBe(COPILOT_EMPTY.awaitingAnalysis);
    });

    it("buy guidance favors accumulate recommendation with bull evidence", () => {
      ingestEvidenceBag({
        workspaceId,
        ticker: "INFY",
        bull: ["Additional quality signal"],
      });
      const assistant = buildDecisionAssistant({ workspaceId, ticker: "INFY" });
      const buy = assistant.guidance.find((g) => g.id === "buy");
      expect(buy?.recommendation).toBe("Favorable");
    });

    it("answers what changed and conviction change via memory", () => {
      recordConclusion("INFY", "Raise target");
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "What changed in conviction?",
      });
      expect(["conviction_change", "what_changed"]).toContain(answer.intent);
    });
  });

  describe("explainability", () => {
    it("buildCopilotExplainability composes Sprint 9E bags without recalculation", () => {
      const view = buildCopilotExplainability({
        workspaceId,
        ticker: "INFY",
        explainability: {
          factorContributions: ["ROE contribution +12%"],
          confidenceDrivers: ["Validation pass"],
          validationStatus: "APPROVED",
          trustScore: "82",
          historicalEvidence: ["Prior accumulate call"],
          decisionTrace: ["Rule pass · margin stability"],
        },
      });
      expect(view.empty).toBe(false);
      expect(view.factorContributions.length).toBeGreaterThanOrEqual(1);
      expect(view.confidenceDrivers.length).toBeGreaterThanOrEqual(1);
      expect(view.validationStatus).toBe("APPROVED");
      expect(view.trustScore).toBe("82");
      expect(view.decisionTrace.length).toBeGreaterThanOrEqual(1);
    });

    it("empty explainability uses Awaiting Analysis", () => {
      const view = buildCopilotExplainability({ workspaceId, ticker: "ZZZ" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(COPILOT_EMPTY.awaitingAnalysis);
    });

    it("explain conclusion uses research memory", () => {
      recordConclusion("INFY", "Maintain accumulate stance");
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "Explain conclusion",
      });
      expect(answer.intent).toBe("explain_conclusion");
      expect(answer.answer).toContain("accumulate");
    });
  });

  describe("recommendations", () => {
    it("getResearchRecommendations surfaces actions monitor earnings alerts portfolio", () => {
      const recs = getResearchRecommendations({
        workspaceId,
        ticker: "INFY",
        earningsLines: ["Q4 results next week"],
        alertLines: ["Margin alert active"],
        portfolioLines: ["2.5% portfolio weight"],
      });
      expect(recs.empty).toBe(false);
      expect(recs.immediateActions.length).toBeGreaterThanOrEqual(1);
      expect(recs.monitorList.length).toBeGreaterThanOrEqual(1);
      expect(recs.upcomingEarnings[0]).toContain("Q4");
      expect(recs.upcomingAlerts[0]).toContain("Margin");
      expect(recs.portfolioImpact[0]).toContain("2.5%");
    });

    it("summarize research question uses notes and insights", () => {
      createNote({ workspaceId, ticker: "INFY", title: "Desk note", body: "Thesis intact" });
      const answer = askResearchQuestion({
        workspaceId,
        ticker: "INFY",
        question: "Summarize research",
      });
      expect(answer.intent).toBe("summarize_research");
      expect(answer.empty).toBe(false);
    });

    it("research next includes quick actions", () => {
      const recs = getResearchRecommendations({ workspaceId, ticker: "INFY" });
      expect(recs.researchNext.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("presentation", () => {
    it("COPILOT_EMPTY copy is institutional", () => {
      expect(COPILOT_EMPTY.noResearchQuestion).toBe("No Research Question");
      expect(COPILOT_EMPTY.noAiSummary).toBe("No AI Summary");
      expect(COPILOT_EMPTY.noComparison).toBe("No Comparison");
      expect(COPILOT_EMPTY.awaitingAnalysis).toBe("Awaiting Analysis");
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => askResearchQuestion({ question: "" })).not.toThrow();
      expect(() => generateResearchSummary()).not.toThrow();
      expect(() =>
        compareResearch({ leftTicker: "A", rightTicker: "B" })
      ).not.toThrow();
      expect(() => buildDecisionAssistant()).not.toThrow();
      expect(() => getResearchRecommendations()).not.toThrow();
      expect(() => buildCopilotExplainability()).not.toThrow();
    });

    it("does not rebuild R1–R5 — timeline still available", () => {
      createNote({ workspaceId, body: "note" });
      const summary = generateResearchSummary({ workspaceId, ticker: "INFY" });
      expect(summary.empty).toBe(false);
    });

    it("resetResearchWorkspace clears copilot state", () => {
      askResearchQuestion({ workspaceId, question: "Test", ticker: "INFY" });
      resetResearchWorkspace();
      const summary = generateResearchSummary({ workspaceId, ticker: "INFY" });
      expect(summary.empty).toBe(true);
    });
  });
});
