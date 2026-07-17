import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateHealthForRecommendation,
  createLivingRecommendation,
  evaluateAndStoreOutcome,
  getLivingRecommendation,
  getRecommendationHealth,
  resetRecommendationRegistry,
  updateRecommendationStatus,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_WORKSPACE_EMPTY,
  archiveWorkspaceRecommendation,
  compareRecommendations,
  exportRecommendationWorkspace,
  filterRecommendations,
  getRecommendationAnalytics,
  getRecommendationWorkspace,
  presentComparison,
  presentWorkspaceAnalytics,
  presentWorkspaceCard,
  presentWorkspaceSearchResults,
  resetRecommendationWorkspace,
  searchRecommendations,
  wireWorkspaceCompany,
  wireWorkspaceDashboard,
  wireWorkspaceHistory,
  wireWorkspacePortfolio,
  wireWorkspaceRecommendationCenter,
  wireWorkspaceReplay,
  wireWorkspaceResearch,
  wireWorkspaceWatchlists,
} from "./index";

function input(
  symbol: string,
  generatedAt: string,
  strategy = "Swing",
  marketRegime = "RISK_ON",
  sector = "Auto",
  industry = "Automobiles"
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: `${symbol} Limited`, exchange: "NSE" },
    strategy,
    generatedAt,
    generatedByEngine: strategy,
    aiVersion: "9F.1.R7",
    originalConviction: 84,
    originalTrust: 88,
    originalValidation: {
      validationStatus: "APPROVED",
      overallValidationScore: 86,
    },
    entryRange: { low: 100, high: 102 },
    stopLoss: 95,
    targets: [
      { price: 110, label: "T1" },
      { price: 118, label: "T2" },
    ],
    riskReward: 2.5,
    convictionDrivers: ["Trend aligned", "Momentum confirmed"],
    riskFactors: ["Market breadth"],
    technicalSnapshot: { trend: "UP", momentum: 78, rsi: 61 },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: marketRegime },
    sectorSnapshot: { sector, industry, strength: 76 },
  };
}

function seed(options: {
  symbol: string;
  timestamp: string;
  outcome: "target2" | "target1" | "stopped" | "expired" | "pending";
  strategy?: string;
  regime?: string;
  sector?: string;
  industry?: string;
  conviction?: number;
  momentum?: number;
  risk?: number;
}) {
  const living = createLivingRecommendation(
    {
      ...input(
        options.symbol,
        options.timestamp,
        options.strategy,
        options.regime,
        options.sector,
        options.industry
      ),
      originalConviction: options.conviction ?? 84,
    }
  );

  if (options.outcome === "pending") {
    return living;
  }

  if (options.outcome === "expired") {
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "EXPIRED",
    });
  } else {
    updateRecommendationStatus({
      recommendationId: living.recommendationId,
      status: "ENTRY_TRIGGERED",
    });
    if (options.outcome === "stopped") {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "STOP_LOSS_HIT",
      });
    } else {
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "ACTIVE",
      });
      updateRecommendationStatus({
        recommendationId: living.recommendationId,
        status: "TARGET_1_HIT",
      });
      if (options.outcome === "target2") {
        updateRecommendationStatus({
          recommendationId: living.recommendationId,
          status: "TARGET_2_HIT",
        });
      }
    }
  }

  calculateHealthForRecommendation(
    living.recommendationId,
    {
      momentum:
        options.momentum ??
        (options.outcome.startsWith("target") ? 90 : 35),
      risk: options.risk ?? (options.outcome.startsWith("target") ? 85 : 28),
      trend: options.outcome.startsWith("target") ? 88 : 40,
      fundamentalStrength: options.outcome.startsWith("target") ? 84 : 42,
    }
  );

  evaluateAndStoreOutcome({
    snapshot: living.snapshot,
    lifecycle: getLivingRecommendation(living.recommendationId),
    health: getRecommendationHealth(living.recommendationId),
    path:
      options.outcome === "target2"
        ? {
            currentPrice: 119,
            highSinceEntry: 120,
            lowSinceEntry: 100,
            sessionsActive: 5,
          }
        : options.outcome === "target1"
          ? {
              currentPrice: 111,
              highSinceEntry: 112,
              lowSinceEntry: 100,
              sessionsActive: 4,
            }
          : options.outcome === "stopped"
            ? {
                currentPrice: 94,
                highSinceEntry: 103,
                lowSinceEntry: 94,
                sessionsActive: 2,
              }
            : undefined,
  });

  return living;
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetRecommendationWorkspace();
});

describe("Recommendation workspace", () => {
  it("composes overview sections from R1–R6 evidence", () => {
    seed({
      symbol: "WS1",
      timestamp: "2026-07-10T09:30:00Z",
      outcome: "target2",
    });
    seed({
      symbol: "WS2",
      timestamp: "2026-07-10T09:31:00Z",
      outcome: "pending",
    });
    const workspace = getRecommendationWorkspace({ refresh: true });
    expect(workspace.sections.overview).toHaveLength(2);
    expect(workspace.sections.active.length).toBeGreaterThan(0);
    expect(workspace.sections.learningSummary).toBeDefined();
    expect(workspace.sections.aiLessons).toBeDefined();
  });

  it("keeps historical snapshots immutable", () => {
    const living = seed({
      symbol: "IMM",
      timestamp: "2026-07-10T09:32:00Z",
      outcome: "target1",
    });
    const conviction = living.snapshot.originalConviction;
    getRecommendationWorkspace({ refresh: true });
    expect(living.snapshot.originalConviction).toBe(conviction);
    expect(Object.isFrozen(living.snapshot)).toBe(true);
  });

  it("exposes executive panels", () => {
    seed({
      symbol: "TOP",
      timestamp: "2026-07-10T09:33:00Z",
      outcome: "target2",
      conviction: 92,
    });
    const workspace = getRecommendationWorkspace({ refresh: true });
    expect(workspace.panels.highestConviction.empty).toBe(false);
    expect(workspace.panels.topPerforming.recommendationIds.length).toBeGreaterThan(
      0
    );
  });

  it("returns empty workspace safely", () => {
    const workspace = getRecommendationWorkspace({ refresh: true });
    expect(workspace.records).toHaveLength(0);
    expect(workspace.analytics.recommendationCount).toBe(0);
  });
});

describe("Search", () => {
  it("searches by ticker and company name", () => {
    seed({
      symbol: "TCS",
      timestamp: "2026-07-11T09:30:00Z",
      outcome: "target1",
    });
    expect(searchRecommendations({ ticker: "TCS" })).toHaveLength(1);
    expect(searchRecommendations({ companyName: "TCS Limited" })).toHaveLength(
      1
    );
  });

  it("searches by sector, industry, strategy and AI version", () => {
    seed({
      symbol: "SEC",
      timestamp: "2026-07-11T09:31:00Z",
      outcome: "target2",
      strategy: "Momentum",
      sector: "Technology",
      industry: "Software",
    });
    expect(searchRecommendations({ sector: "Technology" })).toHaveLength(1);
    expect(searchRecommendations({ industry: "Software" })).toHaveLength(1);
    expect(searchRecommendations({ strategy: "Momentum" })).toHaveLength(1);
    expect(searchRecommendations({ aiVersion: "9F.1.R7" })).toHaveLength(1);
  });

  it("searches by lifecycle, holding period, date, outcome and tags", () => {
    const living = seed({
      symbol: "TAG",
      timestamp: "2026-07-11T09:32:00Z",
      outcome: "target2",
    });
    const current = getLivingRecommendation(living.recommendationId)!;
    expect(
      searchRecommendations({ recommendationDate: "2026-07-11" })
    ).toHaveLength(1);
    expect(
      searchRecommendations({ lifecycleStatus: current.state })
    ).toHaveLength(1);
    expect(
      searchRecommendations({ holdingPeriod: "5–15 Trading Days" })
    ).toHaveLength(1);
    expect(searchRecommendations({ tags: "Trend aligned" })).toHaveLength(1);
    expect(
      searchRecommendations({ institutionalVerdict: "Outstanding" }).length +
        searchRecommendations({ institutionalVerdict: "Successful" }).length
    ).toBeGreaterThan(0);
  });

  it("supports free-text query search", () => {
    seed({
      symbol: "QRY",
      timestamp: "2026-07-11T09:33:00Z",
      outcome: "stopped",
      sector: "Banking",
    });
    expect(searchRecommendations({ query: "banking" })).toHaveLength(1);
  });

  it("returns no search results empty state", () => {
    seed({
      symbol: "NONE",
      timestamp: "2026-07-11T09:34:00Z",
      outcome: "target1",
    });
    const results = presentWorkspaceSearchResults(
      searchRecommendations({ ticker: "MISSING" })
    );
    expect(results.emptyMessage).toBe("No Search Results");
  });
});

describe("Filters", () => {
  it("filters active and completed statuses", () => {
    seed({
      symbol: "ACT",
      timestamp: "2026-07-12T09:30:00Z",
      outcome: "pending",
    });
    seed({
      symbol: "CMP",
      timestamp: "2026-07-12T09:31:00Z",
      outcome: "stopped",
    });
    expect(filterRecommendations({ status: "Pending" }).length).toBeGreaterThan(
      0
    );
    expect(
      filterRecommendations({ status: "Completed" }).length
    ).toBeGreaterThan(0);
  });

  it("filters holding period and strategy", () => {
    seed({
      symbol: "HP",
      timestamp: "2026-07-12T09:32:00Z",
      outcome: "target1",
      strategy: "Momentum",
    });
    expect(
      filterRecommendations({ holdingPeriod: "Swing" })
    ).toHaveLength(1);
    expect(filterRecommendations({ strategy: "Momentum" })).toHaveLength(1);
  });

  it("filters health and institutional outcome verdicts", () => {
    seed({
      symbol: "HLTH",
      timestamp: "2026-07-12T09:33:00Z",
      outcome: "target2",
      momentum: 95,
      risk: 92,
    });
    seed({
      symbol: "FAIL",
      timestamp: "2026-07-12T09:34:00Z",
      outcome: "stopped",
    });
    expect(
      filterRecommendations({
        health: ["Very Strong", "Strong", "Healthy"],
      }).length
    ).toBeGreaterThan(0);
    expect(
      filterRecommendations({
        outcome: ["Failed", "Invalidated"],
      }).length
    ).toBeGreaterThan(0);
  });

  it("filters expired recommendations", () => {
    seed({
      symbol: "EXP",
      timestamp: "2026-07-12T09:35:00Z",
      outcome: "expired",
    });
    expect(filterRecommendations({ status: "Expired" })).toHaveLength(1);
  });
});

describe("Analytics", () => {
  it("computes recommendation counts and rates", () => {
    seed({
      symbol: "A1",
      timestamp: "2026-07-13T09:30:00Z",
      outcome: "target2",
    });
    seed({
      symbol: "A2",
      timestamp: "2026-07-13T09:31:00Z",
      outcome: "stopped",
    });
    const analytics = getRecommendationAnalytics();
    expect(analytics.recommendationCount).toBe(2);
    expect(analytics.successRate).toBe(50);
    expect(analytics.failureRate).toBe(50);
  });

  it("identifies best and worst strategy/sector/regime", () => {
    seed({
      symbol: "B1",
      timestamp: "2026-07-13T09:32:00Z",
      outcome: "target2",
      strategy: "Momentum",
      sector: "Technology",
      regime: "RISK_ON",
    });
    seed({
      symbol: "B2",
      timestamp: "2026-07-13T09:33:00Z",
      outcome: "stopped",
      strategy: "Value",
      sector: "Utilities",
      regime: "RISK_OFF",
    });
    const analytics = getRecommendationAnalytics();
    expect(analytics.bestStrategy).toBeTruthy();
    expect(analytics.worstStrategy).toBeTruthy();
    expect(analytics.bestSector).toBeTruthy();
    expect(analytics.bestMarketRegime).toBeTruthy();
  });

  it("builds recommendation distribution", () => {
    seed({
      symbol: "D1",
      timestamp: "2026-07-13T09:34:00Z",
      outcome: "pending",
    });
    seed({
      symbol: "D2",
      timestamp: "2026-07-13T09:35:00Z",
      outcome: "stopped",
    });
    expect(getRecommendationAnalytics().recommendationDistribution.length).toBeGreaterThan(
      0
    );
  });

  it("presents analytics empty state", () => {
    expect(presentWorkspaceAnalytics(getRecommendationAnalytics()).emptyMessage).toBe(
      "No Analytics Available"
    );
  });
});

describe("Comparison", () => {
  it("compares up to five recommendations", () => {
    const one = seed({
      symbol: "C1",
      timestamp: "2026-07-14T09:30:00Z",
      outcome: "target2",
    });
    const two = seed({
      symbol: "C2",
      timestamp: "2026-07-14T09:31:00Z",
      outcome: "stopped",
    });
    const comparison = compareRecommendations([
      one.recommendationId,
      two.recommendationId,
    ]);
    expect(comparison.empty).toBe(false);
    expect(comparison.rows).toHaveLength(2);
    expect(comparison.rows[0].originalConviction).toBeDefined();
    expect(comparison.rows[0].institutionalVerdict).toBeDefined();
  });

  it("rejects comparisons above five recommendations", () => {
    const ids = Array.from({ length: 6 }, (_, index) =>
      seed({
        symbol: `X${index}`,
        timestamp: `2026-07-14T09:${40 + index}:00Z`,
        outcome: "target1",
      }).recommendationId
    );
    expect(() => compareRecommendations(ids)).toThrow(/at most 5/);
  });

  it("presents no comparison selected empty state", () => {
    expect(presentComparison(compareRecommendations([])).emptyMessage).toBe(
      "No Comparison Selected"
    );
  });
});

describe("Presentation and wiring", () => {
  it("exposes required empty states", () => {
    expect(RECOMMENDATION_WORKSPACE_EMPTY).toEqual({
      noRecommendations: "No Recommendations",
      noSearchResults: "No Search Results",
      noComparisonSelected: "No Comparison Selected",
      noAnalyticsAvailable: "No Analytics Available",
    });
    expect(presentWorkspaceCard(undefined).emptyMessage).toBe(
      "No Recommendations"
    );
  });

  it("wires all requested surfaces", () => {
    seed({
      symbol: "WIRE",
      timestamp: "2026-07-15T09:30:00Z",
      outcome: "target1",
    });
    const bundles = [
      wireWorkspaceDashboard(),
      wireWorkspaceCompany("WIRE"),
      wireWorkspaceResearch(),
      wireWorkspaceRecommendationCenter(),
      wireWorkspaceReplay(),
      wireWorkspaceHistory(),
      wireWorkspacePortfolio(["WIRE"]),
      wireWorkspaceWatchlists(["WIRE"]),
    ];
    expect(bundles.map((bundle) => bundle.surface)).toEqual([
      "dashboard",
      "company",
      "research",
      "recommendation_center",
      "replay",
      "history",
      "portfolio",
      "watchlists",
    ]);
  });

  it("archives through lifecycle without mutating the snapshot", () => {
    const living = seed({
      symbol: "ARC",
      timestamp: "2026-07-15T09:31:00Z",
      outcome: "expired",
    });
    const conviction = living.snapshot.originalConviction;
    const archived = archiveWorkspaceRecommendation(living.recommendationId);
    expect(archived?.workspaceStatus).toBe("Archived");
    expect(living.snapshot.originalConviction).toBe(conviction);
  });
});

describe("Export", () => {
  it("exports CSV, Markdown and PDF through the workspace export API", () => {
    seed({
      symbol: "EXP1",
      timestamp: "2026-07-16T09:30:00Z",
      outcome: "target2",
    });
    getRecommendationWorkspace({ refresh: true });
    const csv = exportRecommendationWorkspace("CSV");
    const markdown = exportRecommendationWorkspace("MARKDOWN");
    const pdf = exportRecommendationWorkspace("PDF");
    expect(csv.contentType).toBe("text/csv");
    expect(String(csv.body)).toContain("recommendationId");
    expect(markdown.contentType).toBe("text/markdown");
    expect(String(markdown.body).length).toBeGreaterThan(0);
    expect(pdf.format).toBe("PDF");
  });
});

describe("Public API", () => {
  it("exposes workspace, search, filter, compare and analytics APIs", () => {
    const living = seed({
      symbol: "API",
      timestamp: "2026-07-17T09:30:00Z",
      outcome: "target2",
      strategy: "Momentum",
    });
    expect(getRecommendationWorkspace({ refresh: true }).records).toHaveLength(
      1
    );
    expect(searchRecommendations({ ticker: "API" })).toHaveLength(1);
    expect(filterRecommendations({ strategy: "Momentum" })).toHaveLength(1);
    expect(
      compareRecommendations([living.recommendationId]).rows
    ).toHaveLength(1);
    expect(getRecommendationAnalytics().recommendationCount).toBe(1);
  });
});
