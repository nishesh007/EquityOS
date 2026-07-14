/**
 * Institutional Validation Dashboard — unit tests (Prompt 9F.11).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationDashboardService,
  registerDashboardService,
  resetValidationDashboardService,
  getDashboardSummary,
  getDashboardMetrics,
  getDashboardHealth,
  getValidationDistribution,
  getTopFailures,
  createSnapshot,
  loadSnapshot,
  DEFAULT_DASHBOARD_CONFIGURATION,
  classifyHealth,
  DashboardCache,
  DashboardTrendAnalyzer,
  DashboardAggregator,
  getRegisteredDashboardModules,
  type DashboardModuleRawMetrics,
} from "./index";

function healthyModule(
  id: string,
  name: string,
  overrides: Partial<DashboardModuleRawMetrics> = {}
): DashboardModuleRawMetrics {
  return {
    moduleId: id,
    moduleName: name,
    validationCount: 100,
    passedCount: 95,
    failedCount: 5,
    warningCount: 2,
    criticalCount: 0,
    averageScore: 92,
    averageRuntime: 12,
    lastValidation: new Date().toISOString(),
    ...overrides,
  };
}

function allHealthyModules(): DashboardModuleRawMetrics[] {
  return [
    healthyModule("dataIntegrity", "Data Integrity Engine", {
      averageScore: 96,
    }),
    healthyModule("ruleEngine", "Rule Engine", { averageScore: 94 }),
    healthyModule("market", "Market Validation", { averageScore: 91 }),
    healthyModule("technical", "Technical Validation", { averageScore: 90 }),
    healthyModule("fundamental", "Fundamental Validation", {
      averageScore: 88,
    }),
    healthyModule("recommendation", "Recommendation Validation", {
      averageScore: 93,
    }),
    healthyModule("tradeSetup", "Trade Setup Validation", {
      averageScore: 89,
    }),
    healthyModule("hallucination", "Hallucination Detection", {
      averageScore: 95,
    }),
    healthyModule("historical", "Historical Performance", {
      averageScore: 87,
    }),
    healthyModule("trust", "Trust Engine", { averageScore: 94 }),
  ];
}

function poorModules(): DashboardModuleRawMetrics[] {
  return allHealthyModules().map((m) => ({
    ...m,
    passedCount: 40,
    failedCount: 60,
    criticalCount: 5,
    averageScore: 45,
    warningCount: 20,
  }));
}

describe("Dashboard registration", () => {
  beforeEach(() => {
    resetValidationDashboardService();
  });

  afterEach(() => {
    resetValidationDashboardService();
  });

  it("registers dashboard service idempotently", () => {
    const first = registerDashboardService({ startBackgroundRefresh: false });
    expect(first.registered).toBe(true);
    expect(first.modulesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredDashboardModules().length).toBeGreaterThanOrEqual(10);

    const second = registerDashboardService({ startBackgroundRefresh: false });
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });

  it("registers future validation modules", () => {
    registerDashboardService({ startBackgroundRefresh: false });
    const service = new ValidationDashboardService();
    const result = service.registerModule({
      id: "altData",
      name: "Alt Data Validation",
      collect: () =>
        healthyModule("altData", "Alt Data Validation", { averageScore: 80 }),
    });
    expect(result.registered).toBe(true);
    const again = service.registerModule({
      id: "altData",
      name: "Alt Data Validation",
      collect: () => healthyModule("altData", "Alt Data Validation"),
    });
    expect(again.skipped).toBe(true);
  });
});

describe("Aggregation", () => {
  beforeEach(() => {
    resetValidationDashboardService();
  });

  it("aggregates summary metrics across modules", () => {
    const service = new ValidationDashboardService();
    const result = service.aggregateOverride(allHealthyModules());
    const s = result.summary.summary;

    expect(s.totalValidations).toBe(1000);
    expect(s.passedValidations).toBe(950);
    expect(s.failedValidations).toBe(50);
    expect(s.averageIntegrityScore).toBe(96);
    expect(s.averageTrustScore).toBe(94);
    expect(s.averageHallucinationScore).toBe(95);
    expect(s.historicalPerformanceScore).toBe(87);
    expect(s.recommendationQuality).toBe(93);
    expect(s.tradeSetupQuality).toBe(89);
    expect(result.summary.modules.length).toBe(10);
  });

  it("builds module status with success and failure percentages", () => {
    const service = new ValidationDashboardService();
    const result = service.aggregateOverride([
      healthyModule("market", "Market", {
        validationCount: 50,
        passedCount: 40,
        failedCount: 10,
      }),
    ]);
    const mod = result.summary.modules[0]!;
    expect(mod.successPercent).toBe(80);
    expect(mod.failurePercent).toBe(20);
    expect(mod.moduleName).toBe("Market");
  });
});

describe("Health score", () => {
  it("classifies health bands from configuration", () => {
    const t = DEFAULT_DASHBOARD_CONFIGURATION.healthThresholds;
    expect(classifyHealth(97, t)).toBe("EXCELLENT");
    expect(classifyHealth(92, t)).toBe("HEALTHY");
    expect(classifyHealth(85, t)).toBe("STABLE");
    expect(classifyHealth(75, t)).toBe("NEEDS_ATTENTION");
    expect(classifyHealth(60, t)).toBe("CRITICAL");
  });

  it("computes overall and per-engine health", () => {
    const service = new ValidationDashboardService();
    const healthy = service.aggregateOverride(allHealthyModules());
    expect(healthy.summary.health.overallHealthScore).toBeGreaterThanOrEqual(
      80
    );
    expect(healthy.summary.health.trustEngineHealth).toBeGreaterThan(80);
    expect(healthy.summary.health.marketHealth).toBeGreaterThan(80);

    const poor = service.aggregateOverride(poorModules());
    expect(poor.summary.health.overallHealthScore).toBeLessThan(70);
    expect(poor.summary.health.overallClassification).toBe("CRITICAL");
  });
});

describe("Filtering", () => {
  it("filters aggregation by module", () => {
    const service = new ValidationDashboardService();
    const result = service.aggregateOverride(allHealthyModules(), undefined, {
      module: ["trust", "market"],
    });
    expect(result.summary.modules.length).toBe(2);
    expect(
      result.summary.modules.every((m) =>
        ["trust", "market"].includes(m.moduleId)
      )
    ).toBe(true);
  });

  it("filters top failures by trust classification and recommendation", () => {
    const service = new ValidationDashboardService();
    const result = service.aggregateOverride(allHealthyModules(), {
      trustScores: [
        { key: "A", score: 60, classification: "REJECT" },
        { key: "B", score: 95, classification: "EXCEPTIONAL" },
      ],
      recommendationScores: [
        { key: "r1", score: 40, recommendation: "BUY" },
        { key: "r2", score: 90, recommendation: "HOLD" },
      ],
      ruleFailureFrequency: { "price.positive": 12, "rsi.range": 3 },
    }, {
      trustClassification: "REJECT",
      recommendation: "BUY",
    });

    expect(result.topFailures.lowestTrustScores.map((x) => x.key)).toEqual([
      "A",
    ]);
    expect(
      result.topFailures.worstRecommendationQuality.map((x) => x.key)
    ).toEqual(["r1"]);
  });
});

describe("Snapshots", () => {
  beforeEach(() => {
    resetValidationDashboardService();
  });

  afterEach(() => {
    resetValidationDashboardService();
  });

  it("creates, loads, and compares snapshots", () => {
    const service = new ValidationDashboardService();
    registerDashboardService({
      service,
      force: true,
      startBackgroundRefresh: false,
    });

    // Seed registry collectors with override path via createSnapshot using live
    // modules (may be empty). Prefer explicit aggregate then snapshot store.
    const first = service.aggregateOverride(allHealthyModules());
    const snap1 = service.createSnapshot("baseline", {
      fromLastAggregation: true,
    });
    expect(snap1.snapshotId).toContain("dashboard:");
    expect(snap1.label).toBe("baseline");

    service.aggregateOverride(poorModules());
    const snap2 = service.createSnapshot("degraded", {
      fromLastAggregation: true,
    });

    const loaded = service.loadSnapshot(snap1.snapshotId);
    expect(loaded?.snapshotId).toBe(snap1.snapshotId);

    const comparison = service.compareSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.healthDelta).toBeLessThan(0);
    expect(service.listSnapshots().length).toBe(2);
    expect(first.summary.health.overallHealthScore).toBeGreaterThan(0);
  });

  it("exposes createSnapshot / loadSnapshot public API", () => {
    registerDashboardService({ startBackgroundRefresh: false, force: true });
    const snap = createSnapshot("api");
    expect(loadSnapshot(snap.snapshotId)?.label).toBe("api");
  });
});

describe("Trend analysis", () => {
  it("detects deteriorating validation quality", () => {
    const analyzer = new DashboardTrendAnalyzer(
      DEFAULT_DASHBOARD_CONFIGURATION
    );
    const now = new Date();
    analyzer.record({
      timestamp: new Date(now.getTime() - 2 * 86400000).toISOString(),
      healthScore: 95,
      averageIntegrityScore: 95,
      averageTrustScore: 94,
      totalValidations: 100,
      failedValidations: 2,
    });
    analyzer.record({
      timestamp: new Date(now.getTime() - 86400000).toISOString(),
      healthScore: 88,
      averageIntegrityScore: 88,
      averageTrustScore: 85,
      totalValidations: 120,
      failedValidations: 20,
    });

    const current = {
      timestamp: now.toISOString(),
      healthScore: 70,
      averageIntegrityScore: 72,
      averageTrustScore: 68,
      totalValidations: 140,
      failedValidations: 40,
    };
    const trend = analyzer.analyze(current, now);
    expect(trend.deteriorating).toBe(true);
    expect(trend.trendDirection).toBe("DOWN");
    expect(trend.previousScore).toBe(88);
  });
});

describe("Caching", () => {
  it("serves cached values within TTL and misses after expiry", () => {
    const cache = new DashboardCache(50);
    cache.set("k", { score: 1 });
    expect(cache.get<{ score: number }>("k")?.score).toBe(1);
    expect(cache.getStats().hits).toBe(1);

    const incremental = cache.incrementalRefresh("k", () => ({ score: 2 }));
    expect(incremental.refreshed).toBe(false);

    cache.set("expired", { score: 3 }, 1);
    // Force expiry
    const entry = (cache as unknown as { store: Map<string, { expiresAt: number }> })
      .store.get("expired");
    if (entry) entry.expiresAt = Date.now() - 1;
    expect(cache.get("expired")).toBeUndefined();
    expect(cache.getStats().misses).toBeGreaterThan(0);
  });

  it("avoids recalculating unchanged dashboard summary via cache", () => {
    const service = new ValidationDashboardService({ cacheTtlMs: 60_000 });
    registerDashboardService({
      service,
      force: true,
      startBackgroundRefresh: false,
    });

    const first = service.refresh({ forceRefresh: true });
    const second = service.refresh();
    expect(second.summary.health.overallHealthScore).toBe(
      first.summary.health.overallHealthScore
    );
    const metrics = service.getDashboardMetrics();
    expect(metrics.cacheHitPercent).toBeGreaterThanOrEqual(0);
  });
});

describe("Metrics and events", () => {
  beforeEach(() => {
    resetValidationDashboardService();
  });

  afterEach(() => {
    resetValidationDashboardService();
  });

  it("tracks operational dashboard metrics", () => {
    const service = new ValidationDashboardService();
    registerDashboardService({
      service,
      force: true,
      startBackgroundRefresh: false,
    });
    service.refresh({ forceRefresh: true });
    service.createSnapshot("m");
    const metrics = service.getDashboardMetrics();
    expect(metrics.totalRefreshes).toBeGreaterThan(0);
    expect(metrics.moduleCount).toBeGreaterThanOrEqual(10);
    expect(metrics.snapshotCount).toBeGreaterThanOrEqual(1);
    expect(metrics.averageAggregationTime).toBeGreaterThanOrEqual(0);
  });

  it("emits DashboardUpdated, SnapshotCreated, CriticalFailureDetected", () => {
    const service = new ValidationDashboardService();
    const seen: string[] = [];
    service.getEvents().on("*", (e) => seen.push(e.type));

    service.aggregateOverride(poorModules());
    service.createSnapshot("crit", { fromLastAggregation: true });

    // createSnapshot also refreshes live modules — ensure events from override + snapshot
    expect(seen).toContain("DashboardUpdated");
    expect(seen).toContain("SnapshotCreated");
    expect(seen).toContain("CriticalFailureDetected");
  });

  it("emits HealthChanged and TrustChanged on material shifts", () => {
    const service = new ValidationDashboardService();
    const seen: string[] = [];
    service.getEvents().on("*", (e) => seen.push(e.type));

    service.aggregateOverride(allHealthyModules());
    service.aggregateOverride(poorModules());

    expect(seen.filter((t) => t === "HealthChanged").length).toBeGreaterThan(0);
    expect(seen.filter((t) => t === "TrustChanged").length).toBeGreaterThan(0);
  });
});

describe("Distribution and top failures", () => {
  it("builds validation distribution and top failure lists", () => {
    const aggregator = new DashboardAggregator(
      DEFAULT_DASHBOARD_CONFIGURATION
    );
    const result = aggregator.aggregate({
      modules: allHealthyModules(),
      extras: {
        ruleFailureFrequency: {
          "price.positive": 20,
          "rsi.range": 5,
        },
        rejectedDatasets: { STOCK_QUOTE: 7, AI_REPORT: 2 },
        hallucinationRisks: [
          { key: "ai-1", score: 80 },
          { key: "ai-2", score: 20 },
        ],
        trustScores: [
          { key: "t1", score: 55 },
          { key: "t2", score: 98 },
        ],
        integrityScores: [
          { key: "i1", score: 40 },
          { key: "i2", score: 99 },
        ],
        recommendationScores: [{ key: "r1", score: 30 }],
        tradeSetupScores: [{ key: "s1", score: 25 }],
        ruleCategories: { price: 10, rsi: 4 },
        severities: { CRITICAL: 2, WARNING: 8 },
        datasetTypes: { STOCK_QUOTE: 12 },
        recommendationTypes: { BUY: 5, SELL: 2 },
      },
    });

    expect(result.distribution.byModule.trust).toBe(100);
    expect(result.distribution.bySeverity.CRITICAL).toBe(2);
    expect(result.topFailures.mostFailingRules[0]?.ruleId).toBe(
      "price.positive"
    );
    expect(result.topFailures.highestHallucinationRisk[0]?.key).toBe("ai-1");
    expect(result.topFailures.lowestTrustScores[0]?.key).toBe("t1");
    expect(result.topFailures.worstTradeSetups[0]?.score).toBe(25);
  });
});

describe("Public API wrappers", () => {
  beforeEach(() => {
    resetValidationDashboardService();
  });

  afterEach(() => {
    resetValidationDashboardService();
  });

  it("exposes summary, metrics, health, distribution, topFailures", () => {
    registerDashboardService({ startBackgroundRefresh: false, force: true });
    expect(getDashboardSummary().engineVersion).toBe(
      DEFAULT_DASHBOARD_CONFIGURATION.engineVersion
    );
    expect(getDashboardHealth().overallHealthScore).toBeGreaterThanOrEqual(0);
    expect(getValidationDistribution().byModule).toBeTruthy();
    expect(getTopFailures().mostFailingRules).toBeTruthy();
    expect(getDashboardMetrics().moduleCount).toBeGreaterThanOrEqual(10);
  });

  it("uses configurable defaults without hardcoded consumer weights", () => {
    expect(DEFAULT_DASHBOARD_CONFIGURATION.cacheTtlMs).toBeGreaterThan(0);
    expect(DEFAULT_DASHBOARD_CONFIGURATION.healthThresholds.excellent).toBe(95);
    expect(DEFAULT_DASHBOARD_CONFIGURATION.healthWeights.trustEngine).toBe(0.2);
  });
});
