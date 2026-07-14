/**
 * Institutional Validation Analytics Engine — master façade (Prompt 9F.14).
 * Analytical only: consumes validation outputs, never modifies results.
 */

import {
  DEFAULT_ANALYTICS_CONFIGURATION,
  resolveAnalyticsConfiguration,
  type AnalyticsConfiguration,
  type AnalyticsConfigurationInput,
} from "./AnalyticsConfiguration";
import {
  AnalyticsAggregator,
  type AnalyticsSummary,
} from "./AnalyticsAggregator";
import { clampScore } from "./AnalyticsCalculator";
import {
  areBuiltinAnalyticsSourcesRegistered,
  collectAllObservations,
  getRegisteredAnalyticsSources,
  markBuiltinAnalyticsSourcesRegistered,
  registerAnalyticsSource,
  resetAnalyticsSourceRegistrationState,
  type AnalyticsObservation,
  type AnalyticsSourceDefinition,
} from "./AnalyticsRegistry";
import { AnalyticsMetricsTracker } from "./AnalyticsMetrics";
import { AnalyticsAuditLogger } from "./AnalyticsAuditLogger";
import { AnalyticsTrendAnalyzer, type TrendAnalyticsReport } from "./AnalyticsTrendAnalyzer";
import {
  AnalyticsDistribution,
  type DistributionAnalyticsReport,
} from "./AnalyticsDistribution";
import {
  AnalyticsRuleEffectiveness,
  type RuleEffectivenessReport,
} from "./AnalyticsRuleEffectiveness";
import {
  AnalyticsFailurePatterns,
  type FailureAnalyticsReport,
} from "./AnalyticsFailurePatterns";
import {
  AnalyticsPredictionEngine,
  type PredictionAnalyticsReport,
} from "./AnalyticsPredictionEngine";
import {
  AnalyticsSnapshotStore,
  compareAnalyticsSnapshots,
  createAnalyticsSnapshotId,
  type AnalyticsSnapshot,
  type AnalyticsSnapshotComparison,
} from "./AnalyticsSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface AnalyticsRunResult {
  runId: string;
  summary: AnalyticsSummary;
  ruleEffectiveness: RuleEffectivenessReport;
  failureAnalytics: FailureAnalyticsReport;
  trends: TrendAnalyticsReport;
  distributions: DistributionAnalyticsReport;
  predictions: PredictionAnalyticsReport;
  healthScore: number;
  executionTimeMs: number;
  warnings: string[];
  engineVersion: string;
}

export interface AnalyticsHealthBreakdown {
  validationStability: number;
  ruleEffectiveness: number;
  failureTrends: number;
  runtimeStability: number;
  trustStability: number;
  predictionConfidence: number;
}

let defaultEngine: ValidationAnalyticsEngine | null = null;
let engineRegistered = false;

export class ValidationAnalyticsEngine {
  private config: AnalyticsConfiguration;
  private aggregator: AnalyticsAggregator;
  private trends: AnalyticsTrendAnalyzer;
  private distribution: AnalyticsDistribution;
  private rules: AnalyticsRuleEffectiveness;
  private failures: AnalyticsFailurePatterns;
  private predictions: AnalyticsPredictionEngine;
  private metrics: AnalyticsMetricsTracker;
  private audit: AnalyticsAuditLogger;
  private snapshots: AnalyticsSnapshotStore;
  private readonly history: AnalyticsObservation[] = [];
  private lastRun: AnalyticsRunResult | null = null;

  constructor(configInput?: AnalyticsConfigurationInput) {
    this.config = resolveAnalyticsConfiguration(configInput);
    this.aggregator = new AnalyticsAggregator();
    this.trends = new AnalyticsTrendAnalyzer(this.config);
    this.distribution = new AnalyticsDistribution();
    this.rules = new AnalyticsRuleEffectiveness(this.config);
    this.failures = new AnalyticsFailurePatterns();
    this.predictions = new AnalyticsPredictionEngine(this.config);
    this.metrics = new AnalyticsMetricsTracker();
    this.audit = new AnalyticsAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new AnalyticsSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): AnalyticsConfiguration {
    return resolveAnalyticsConfiguration(this.config);
  }

  registerSource(
    definition: AnalyticsSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerAnalyticsSource(definition, options);
  }

  /** Ingest observations without mutating source systems. */
  ingest(observations: AnalyticsObservation[]): void {
    for (const o of observations) {
      this.history.push(o);
    }
    while (this.history.length > this.config.maxHistoryPoints) {
      this.history.shift();
    }
  }

  /** Full analytics run over registered sources + history. */
  run(options?: {
    observations?: AnalyticsObservation[];
    includeLiveCollectors?: boolean;
  }): AnalyticsRunResult {
    const started = Date.now();
    const warnings: string[] = [];
    const live =
      options?.includeLiveCollectors === false
        ? []
        : collectAllObservations();
    const observations = [
      ...this.history,
      ...live,
      ...(options?.observations ?? []),
    ];

    if (observations.length < this.config.minSampleSize) {
      warnings.push(
        `Sample size ${observations.length} below minimum ${this.config.minSampleSize}`
      );
    }

    const summary = this.aggregator.aggregate(observations);
    const ruleEffectiveness = this.rules.analyze(observations);
    const failureAnalytics = this.failures.analyze(observations);
    const trends = this.trends.analyze(observations);
    const distributions = this.distribution.analyze(observations);
    const predictions = this.predictions.analyze({
      observations,
      summary,
      rules: ruleEffectiveness,
      failures: failureAnalytics,
      trends,
    });

    const { healthScore, breakdown } = this.computeHealthScore({
      summary,
      ruleEffectiveness,
      failureAnalytics,
      trends,
      predictions,
    });
    void breakdown;

    const executionTimeMs = Date.now() - started;
    const runId = `arun-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result: AnalyticsRunResult = {
      runId,
      summary,
      ruleEffectiveness,
      failureAnalytics,
      trends,
      distributions,
      predictions,
      healthScore,
      executionTimeMs,
      warnings,
      engineVersion: this.config.engineVersion,
    };

    this.lastRun = result;
    this.metrics.recordRun({
      runtimeMs: executionTimeMs,
      healthScore,
      trendCount: 9,
      ruleCount: ruleEffectiveness.ruleCount,
    });
    this.metrics.setSnapshotCount(this.snapshots.size);

    this.audit.append({
      timestamp: new Date().toISOString(),
      analyticsRunId: runId,
      executionTimeMs,
      healthScore,
      predictionSummary: `${predictions.predictions.length} predictions; avgConfidence=${predictions.averageConfidence}`,
      warnings,
      errors: [],
      engineVersion: this.config.engineVersion,
      observationCount: observations.length,
    });

    safePublishEvent({
      eventType: "DashboardRefreshed",
      module: "analytics",
      payload: {
        healthScore,
        runId,
        advisoryOnly: true,
      },
      executionTimeMs,
      source: "analytics-engine",
    });

    return result;
  }

  getAnalyticsSummary(options?: {
    observations?: AnalyticsObservation[];
  }): AnalyticsSummary {
    return this.run({
      observations: options?.observations,
    }).summary;
  }

  getRuleEffectiveness(options?: {
    observations?: AnalyticsObservation[];
  }): RuleEffectivenessReport {
    return this.run({
      observations: options?.observations,
    }).ruleEffectiveness;
  }

  getFailureAnalytics(options?: {
    observations?: AnalyticsObservation[];
  }): FailureAnalyticsReport {
    return this.run({
      observations: options?.observations,
    }).failureAnalytics;
  }

  getTrendAnalytics(options?: {
    observations?: AnalyticsObservation[];
  }): TrendAnalyticsReport {
    return this.run({
      observations: options?.observations,
    }).trends;
  }

  getDistributionAnalytics(options?: {
    observations?: AnalyticsObservation[];
  }): DistributionAnalyticsReport {
    return this.run({
      observations: options?.observations,
    }).distributions;
  }

  getPredictionAnalytics(options?: {
    observations?: AnalyticsObservation[];
  }): PredictionAnalyticsReport {
    return this.run({
      observations: options?.observations,
    }).predictions;
  }

  createAnalyticsSnapshot(label?: string): AnalyticsSnapshot {
    const result = this.lastRun ?? this.run();
    const snapshot: AnalyticsSnapshot = {
      snapshotId: createAnalyticsSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      summary: result.summary,
      ruleEffectiveness: result.ruleEffectiveness,
      failureAnalytics: result.failureAnalytics,
      trends: result.trends,
      distributions: result.distributions,
      predictions: result.predictions,
      healthScore: result.healthScore,
      engineVersion: this.config.engineVersion,
    };
    this.snapshots.save(snapshot);
    this.metrics.setSnapshotCount(this.snapshots.size);
    return snapshot;
  }

  loadAnalyticsSnapshot(snapshotId: string): AnalyticsSnapshot | null {
    return this.snapshots.load(snapshotId);
  }

  compareAnalyticsSnapshots(
    baselineId: string,
    compareId: string
  ): AnalyticsSnapshotComparison | null {
    const baseline = this.snapshots.load(baselineId);
    const compare = this.snapshots.load(compareId);
    if (!baseline || !compare) return null;
    return compareAnalyticsSnapshots(
      baseline,
      compare,
      this.config.collapseDropThreshold
    );
  }

  listSnapshots(): AnalyticsSnapshot[] {
    return this.snapshots.list();
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  /** Test helper — analyze supplied observations without live collectors. */
  analyzeObservations(observations: AnalyticsObservation[]): AnalyticsRunResult {
    return this.run({
      observations,
      includeLiveCollectors: false,
    });
  }

  resetOperationalState(): void {
    this.history.length = 0;
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastRun = null;
  }

  private computeHealthScore(input: {
    summary: AnalyticsSummary;
    ruleEffectiveness: RuleEffectivenessReport;
    failureAnalytics: FailureAnalyticsReport;
    trends: TrendAnalyticsReport;
    predictions: PredictionAnalyticsReport;
  }): { healthScore: number; breakdown: AnalyticsHealthBreakdown } {
    const w = this.config.healthWeights;
    const failureRate =
      input.summary.totalValidations === 0
        ? 0
        : (input.summary.failed / input.summary.totalValidations) * 100;

    const validationStability = clampScore(
      100 - failureRate - input.summary.criticalFailures * 2
    );
    const ruleEffectiveness = input.ruleEffectiveness.averageReliability;
    const failureTrends = clampScore(
      100 -
        input.failureAnalytics.failureFrequency * 0.5 -
        (input.trends.deteriorating ? 15 : 0)
    );
    const runtimeStability = clampScore(
      input.trends.weekly.stability ||
        (input.summary.averageRuntime < 1000 ? 90 : 70)
    );
    const trustStability = clampScore(
      input.summary.averageTrustScore * 0.7 +
        input.trends.weekly.averageTrust * 0.3
    );
    const predictionConfidence = clampScore(
      input.predictions.averageConfidence || 70
    );

    const breakdown: AnalyticsHealthBreakdown = {
      validationStability,
      ruleEffectiveness,
      failureTrends,
      runtimeStability,
      trustStability,
      predictionConfidence,
    };

    const weightSum =
      w.validationStability +
      w.ruleEffectiveness +
      w.failureTrends +
      w.runtimeStability +
      w.trustStability +
      w.predictionConfidence;

    const healthScore =
      weightSum <= 0
        ? 0
        : clampScore(
            (validationStability * w.validationStability +
              ruleEffectiveness * w.ruleEffectiveness +
              failureTrends * w.failureTrends +
              runtimeStability * w.runtimeStability +
              trustStability * w.trustStability +
              predictionConfidence * w.predictionConfidence) /
              weightSum
          );

    return { healthScore, breakdown };
  }
}

/** Built-in read-only collectors — never mutate source engines. */
export function buildBuiltinAnalyticsSources(): AnalyticsSourceDefinition[] {
  return [
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      collect: () =>
        safeCollect("dataIntegrity", () => {
          const { getMetrics } = require("../DataIntegrityEngine") as {
            getMetrics: () => {
              datasetsValidated: number;
              datasetsApproved: number;
              datasetsRejected: number;
              warningCount: number;
              criticalErrors: number;
              averageExecutionTime: number;
              averageIntegrityScore: number;
            };
          };
          const m = getMetrics();
          return [
            {
              sourceId: "dataIntegrity",
              timestamp: new Date().toISOString(),
              module: "dataIntegrity",
              validationCount: m.datasetsValidated,
              passed: m.datasetsApproved,
              failed: m.datasetsRejected,
              warnings: m.warningCount,
              critical: m.criticalErrors,
              averageRuntimeMs: m.averageExecutionTime,
              integrityScore: m.averageIntegrityScore,
            },
          ];
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect("trust", () => {
          const { getTrustMetrics } = require("../trust") as {
            getTrustMetrics: () => {
              totalCalculations: number;
              averageTrustScore: number;
              rejectedObjects: number;
              averageValidationRuntime: number;
            };
          };
          const m = getTrustMetrics();
          return [
            {
              sourceId: "trust",
              timestamp: new Date().toISOString(),
              module: "trust",
              validationCount: m.totalCalculations,
              passed: Math.max(0, m.totalCalculations - m.rejectedObjects),
              failed: m.rejectedObjects,
              averageRuntimeMs: m.averageValidationRuntime,
              trustScore: m.averageTrustScore,
            },
          ];
        }),
    },
    {
      id: "hallucination",
      name: "Hallucination Engine",
      collect: () =>
        safeCollect("hallucination", () => {
          const {
            getHallucinationValidationMetrics,
          } = require("../rules/hallucination") as {
            getHallucinationValidationMetrics: () => {
              aiOutputsValidated: number;
              hallucinationsDetected: number;
              averageHallucinationScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHallucinationValidationMetrics();
          return [
            {
              sourceId: "hallucination",
              timestamp: new Date().toISOString(),
              module: "hallucination",
              validationCount: m.aiOutputsValidated,
              failed: m.hallucinationsDetected,
              passed: Math.max(
                0,
                m.aiOutputsValidated - m.hallucinationsDetected
              ),
              averageRuntimeMs: m.averageValidationRuntime,
              hallucinationScore: m.averageHallucinationScore,
            },
          ];
        }),
    },
    {
      id: "historical",
      name: "Historical Engine",
      collect: () =>
        safeCollect("historical", () => {
          const {
            getHistoricalValidationMetrics,
          } = require("../rules/historical") as {
            getHistoricalValidationMetrics: () => {
              recommendationsAnalysed: number;
              tradesAnalysed: number;
              historicalScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          const total = m.recommendationsAnalysed + m.tradesAnalysed;
          return [
            {
              sourceId: "historical",
              timestamp: new Date().toISOString(),
              module: "historical",
              validationCount: total,
              passed: total,
              averageRuntimeMs: m.averageValidationRuntime,
              historicalScore: m.historicalScore,
            },
          ];
        }),
    },
    {
      id: "recommendation",
      name: "Recommendation Validation",
      collect: () =>
        safeCollect("recommendation", () => {
          const {
            getRecommendationValidationMetrics,
          } = require("../rules/recommendation") as {
            getRecommendationValidationMetrics: () => {
              recommendationsValidated: number;
              rejected: number;
              warnings: number;
              averageQualityScore: number;
              averageValidationTime: number;
              ruleFailureFrequency: Record<string, number>;
            };
          };
          const m = getRecommendationValidationMetrics();
          const base: AnalyticsObservation[] = [
            {
              sourceId: "recommendation",
              timestamp: new Date().toISOString(),
              module: "recommendation",
              validationCount: m.recommendationsValidated,
              failed: m.rejected,
              passed: Math.max(0, m.recommendationsValidated - m.rejected),
              warnings: m.warnings,
              averageRuntimeMs: m.averageValidationTime,
              recommendationQuality: m.averageQualityScore,
            },
          ];
          for (const [ruleId, failures] of Object.entries(
            m.ruleFailureFrequency ?? {}
          )) {
            base.push({
              sourceId: "recommendation",
              timestamp: new Date().toISOString(),
              module: "recommendation",
              ruleId,
              ruleTriggered: true,
              ruleFailed: failures > 0,
              failed: failures,
            });
          }
          return base;
        }),
    },
    {
      id: "tradeSetup",
      name: "Trade Setup Validation",
      collect: () =>
        safeCollect("tradeSetup", () => {
          const {
            getTradeSetupValidationMetrics,
          } = require("../rules/tradeSetup") as {
            getTradeSetupValidationMetrics: () => {
              tradeSetupsValidated: number;
              rejectedSetups: number;
              averageQualityScore: number;
              averageValidationRuntime: number;
              ruleFailureFrequency: Record<string, number>;
            };
          };
          const m = getTradeSetupValidationMetrics();
          const base: AnalyticsObservation[] = [
            {
              sourceId: "tradeSetup",
              timestamp: new Date().toISOString(),
              module: "tradeSetup",
              validationCount: m.tradeSetupsValidated,
              failed: m.rejectedSetups,
              passed: Math.max(0, m.tradeSetupsValidated - m.rejectedSetups),
              averageRuntimeMs: m.averageValidationRuntime,
              tradeQuality: m.averageQualityScore,
            },
          ];
          for (const [ruleId, failures] of Object.entries(
            m.ruleFailureFrequency ?? {}
          )) {
            base.push({
              sourceId: "tradeSetup",
              timestamp: new Date().toISOString(),
              module: "tradeSetup",
              ruleId,
              ruleTriggered: true,
              ruleFailed: failures > 0,
              failed: failures,
            });
          }
          return base;
        }),
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      collect: () =>
        safeCollect("dashboard", () => {
          const { getDashboardSummary } = require("../dashboard") as {
            getDashboardSummary: () => {
              summary: {
                totalValidations: number;
                failedValidations: number;
                warningCount: number;
                criticalCount: number;
                averageIntegrityScore: number;
                averageTrustScore: number;
              };
              health: { overallHealthScore: number };
            };
          };
          const s = getDashboardSummary();
          return [
            {
              sourceId: "dashboard",
              timestamp: new Date().toISOString(),
              module: "dashboard",
              validationCount: s.summary.totalValidations,
              failed: s.summary.failedValidations,
              warnings: s.summary.warningCount,
              critical: s.summary.criticalCount,
              integrityScore: s.summary.averageIntegrityScore,
              trustScore: s.summary.averageTrustScore,
            },
          ];
        }),
    },
    {
      id: "eventBus",
      name: "Validation Event Bus",
      collect: () =>
        safeCollect("eventBus", () => {
          const { getEventMetrics } = require("../events") as {
            getEventMetrics: () => {
              totalEvents: number;
              criticalEvents: number;
              failureCount: number;
              averageDispatchTimeMs: number;
            };
          };
          const m = getEventMetrics();
          return [
            {
              sourceId: "eventBus",
              timestamp: new Date().toISOString(),
              module: "eventBus",
              validationCount: m.totalEvents,
              critical: m.criticalEvents,
              failed: m.failureCount,
              averageRuntimeMs: m.averageDispatchTimeMs,
            },
          ];
        }),
    },
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getMetrics: () => {
                requests: number;
                failed: number;
                completed: number;
                averageExecutionTime: number;
              };
            };
          };
          const m = getValidationOrchestrator().getMetrics();
          return [
            {
              sourceId: "orchestrator",
              timestamp: new Date().toISOString(),
              module: "orchestrator",
              validationCount: m.requests,
              failed: m.failed,
              passed: m.completed,
              averageRuntimeMs: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "market",
      name: "Market Validation",
      collect: () =>
        safeCollect("market", () => {
          const { getMarketValidationMetrics } = require("../rules/market") as {
            getMarketValidationMetrics: () => {
              marketDatasetsValidated: number;
              rejectedDatasets: number;
              warningCount: number;
              criticalFailures: number;
              averageExecutionTime: number;
            };
          };
          const m = getMarketValidationMetrics();
          return [
            {
              sourceId: "market",
              timestamp: new Date().toISOString(),
              module: "market",
              validationCount: m.marketDatasetsValidated,
              failed: m.rejectedDatasets,
              passed: Math.max(
                0,
                m.marketDatasetsValidated - m.rejectedDatasets
              ),
              warnings: m.warningCount,
              critical: m.criticalFailures,
              averageRuntimeMs: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "technical",
      name: "Technical Validation",
      collect: () =>
        safeCollect("technical", () => {
          const {
            getTechnicalValidationMetrics,
          } = require("../rules/technical") as {
            getTechnicalValidationMetrics: () => {
              indicatorsValidated: number;
              failedIndicators: number;
              warnings: number;
              criticalFailures: number;
              averageRuntime: number;
            };
          };
          const m = getTechnicalValidationMetrics();
          return [
            {
              sourceId: "technical",
              timestamp: new Date().toISOString(),
              module: "technical",
              validationCount: m.indicatorsValidated,
              failed: m.failedIndicators,
              passed: Math.max(0, m.indicatorsValidated - m.failedIndicators),
              warnings: m.warnings,
              critical: m.criticalFailures,
              averageRuntimeMs: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "fundamental",
      name: "Fundamental Validation",
      collect: () =>
        safeCollect("fundamental", () => {
          const {
            getFundamentalValidationMetrics,
          } = require("../rules/fundamental") as {
            getFundamentalValidationMetrics: () => {
              companiesValidated: number;
              ratioFailures: number;
              accountingAnomalies: number;
              averageExecutionTime: number;
            };
          };
          const m = getFundamentalValidationMetrics();
          const failed = m.ratioFailures + m.accountingAnomalies;
          return [
            {
              sourceId: "fundamental",
              timestamp: new Date().toISOString(),
              module: "fundamental",
              validationCount: m.companiesValidated,
              failed,
              passed: Math.max(0, m.companiesValidated - failed),
              averageRuntimeMs: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "ruleEngine",
      name: "Rule Engine",
      collect: () =>
        safeCollect("ruleEngine", () => {
          const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
            getDataIntegrityEngine: () => {
              getRuleEngine: () => {
                getAggregateMetrics: () => {
                  totalExecutions: number;
                  successRate: number;
                  failureRate: number;
                  averageRuntime: number;
                };
                getRuleMetrics: () => Array<{
                  ruleId: string;
                  executions: number;
                  failures: number;
                  successes: number;
                  averageRuntime: number;
                }>;
              };
            };
          };
          const engine = getDataIntegrityEngine().getRuleEngine();
          const agg = engine.getAggregateMetrics();
          const rows: AnalyticsObservation[] = [
            {
              sourceId: "ruleEngine",
              timestamp: new Date().toISOString(),
              module: "ruleEngine",
              validationCount: agg.totalExecutions,
              passed: Math.round((agg.successRate / 100) * agg.totalExecutions),
              failed: Math.round((agg.failureRate / 100) * agg.totalExecutions),
              averageRuntimeMs: agg.averageRuntime,
            },
          ];
          for (const r of engine.getRuleMetrics()) {
            rows.push({
              sourceId: "ruleEngine",
              timestamp: new Date().toISOString(),
              module: "ruleEngine",
              ruleId: r.ruleId,
              ruleTriggered: r.executions > 0,
              ruleFailed: r.failures > 0,
              failed: r.failures,
              passed: r.successes,
              averageRuntimeMs: r.averageRuntime,
            });
          }
          return rows;
        }),
    },
  ];
}

function safeCollect(
  sourceId: string,
  collect: () => AnalyticsObservation[]
): AnalyticsObservation[] {
  try {
    return collect();
  } catch {
    return [
      {
        sourceId: sourceId as AnalyticsObservation["sourceId"],
        timestamp: new Date().toISOString(),
        module: sourceId,
        validationCount: 0,
      },
    ];
  }
}

export function registerBuiltinAnalyticsSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinAnalyticsSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredAnalyticsSources().length,
      total: getRegisteredAnalyticsSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinAnalyticsSources()) {
    const result = registerAnalyticsSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinAnalyticsSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredAnalyticsSources().length,
  };
}

export interface AnalyticsRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

/** Idempotent analytics engine startup registration. */
export function registerValidationAnalyticsEngine(options?: {
  engine?: ValidationAnalyticsEngine;
  config?: AnalyticsConfigurationInput;
  force?: boolean;
}): AnalyticsRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredAnalyticsSources().length,
    };
  }

  const sources = registerBuiltinAnalyticsSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationAnalyticsEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationAnalyticsEngine(
  options?: AnalyticsConfigurationInput
): ValidationAnalyticsEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationAnalyticsEngine(options);
    registerBuiltinAnalyticsSources();
  }
  return defaultEngine;
}

export function resetValidationAnalyticsEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetAnalyticsSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function getAnalyticsSummary(options?: {
  observations?: AnalyticsObservation[];
}): AnalyticsSummary {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getAnalyticsSummary(options);
}

export function getRuleEffectiveness(options?: {
  observations?: AnalyticsObservation[];
}): RuleEffectivenessReport {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getRuleEffectiveness(options);
}

export function getFailureAnalytics(options?: {
  observations?: AnalyticsObservation[];
}): FailureAnalyticsReport {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getFailureAnalytics(options);
}

export function getTrendAnalytics(options?: {
  observations?: AnalyticsObservation[];
}): TrendAnalyticsReport {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getTrendAnalytics(options);
}

export function getDistributionAnalytics(options?: {
  observations?: AnalyticsObservation[];
}): DistributionAnalyticsReport {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getDistributionAnalytics(options);
}

export function getPredictionAnalytics(options?: {
  observations?: AnalyticsObservation[];
}): PredictionAnalyticsReport {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().getPredictionAnalytics(options);
}

export function createAnalyticsSnapshot(label?: string): AnalyticsSnapshot {
  registerValidationAnalyticsEngine();
  return getValidationAnalyticsEngine().createAnalyticsSnapshot(label);
}

export {
  DEFAULT_ANALYTICS_CONFIGURATION,
  resolveAnalyticsConfiguration,
  registerAnalyticsSource,
};
