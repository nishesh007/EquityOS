/**
 * Institutional Validation Intelligence & Insights Engine — façade (Prompt 9F.21).
 * Advisory only: never modifies validation decisions.
 */

import {
  DEFAULT_INSIGHTS_CONFIGURATION,
  resolveInsightsConfiguration,
  type InsightsConfiguration,
  type InsightsConfigurationInput,
} from "./InsightsConfiguration";
import {
  areBuiltinInsightSourcesRegistered,
  collectAllInsightObservations,
  getRegisteredInsightSources,
  markBuiltinInsightSourcesRegistered,
  registerInsightSource,
  resetInsightSourceRegistrationState,
  type InsightObservation,
  type InsightSourceDefinition,
} from "./InsightsRegistry";
import { InsightsAnalyzer } from "./InsightsAnalyzer";
import type { InsightsPack } from "./InsightsAggregator";
import { PatternDetector } from "./PatternDetector";
import { CorrelationEngine } from "./CorrelationEngine";
import { RiskInsightEngine } from "./RiskInsightEngine";
import { RecommendationGenerator } from "./RecommendationGenerator";
import { InsightsMetricsTracker } from "./InsightsMetrics";
import { InsightsAuditLogger } from "./InsightsAuditLogger";
import {
  InsightSnapshotStore,
  buildSnapshotPayload,
  compareInsightSnapshots,
  type InsightSnapshot,
  type InsightSnapshotComparison,
} from "./InsightSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface GenerateInsightsOptions {
  observations?: InsightObservation[];
  includeLiveCollectors?: boolean;
}

let defaultEngine: ValidationIntelligenceEngine | null = null;
let engineRegistered = false;

export class ValidationIntelligenceEngine {
  private config: InsightsConfiguration;
  private analyzer: InsightsAnalyzer;
  private patternDetector: PatternDetector;
  private correlationEngine: CorrelationEngine;
  private riskEngine: RiskInsightEngine;
  private recommendationGenerator: RecommendationGenerator;
  private readonly metrics = new InsightsMetricsTracker();
  private audit: InsightsAuditLogger;
  private snapshots: InsightSnapshotStore;
  private lastPack: InsightsPack | null = null;

  constructor(configInput?: InsightsConfigurationInput) {
    this.config = resolveInsightsConfiguration(configInput);
    this.analyzer = new InsightsAnalyzer(this.config);
    this.patternDetector = new PatternDetector(this.config);
    this.correlationEngine = new CorrelationEngine(this.config);
    this.riskEngine = new RiskInsightEngine(this.config);
    this.recommendationGenerator = new RecommendationGenerator(this.config);
    this.audit = new InsightsAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new InsightSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): InsightsConfiguration {
    return resolveInsightsConfiguration(this.config);
  }

  updateConfiguration(input: InsightsConfigurationInput): void {
    this.config = resolveInsightsConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.analyzer.setConfiguration(this.config);
    this.patternDetector.setConfiguration(this.config);
    this.correlationEngine.setConfiguration(this.config);
    this.riskEngine.setConfiguration(this.config);
    this.recommendationGenerator.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: InsightSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerInsightSource(definition, options);
  }

  generateInsights(options: GenerateInsightsOptions = {}): InsightsPack {
    const started = Date.now();
    try {
      const observations = this.resolveObservations(options);
      const pack = this.analyzer.analyze(observations);
      this.lastPack = pack;

      const avgConfidence =
        pack.recommendations.length === 0
          ? 0
          : pack.recommendations.reduce((s, r) => s + r.confidence, 0) /
            pack.recommendations.length;

      const executionTimeMs = Date.now() - started;
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        patterns: pack.patterns.length,
        correlations: pack.correlations.length,
        recommendations: pack.recommendations.length,
        insightScore: pack.score.overall,
        averageConfidence: avgConfidence,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "InsightsGenerated",
        insightScore: pack.score.overall,
        scoreBreakdown: pack.score,
        patternCount: pack.patterns.length,
        correlationCount: pack.correlations.length,
        recommendationCount: pack.recommendations.length,
        executionTimeMs,
        warnings: pack.warnings,
        errors: pack.errors,
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "intelligence",
        source: "intelligence-engine",
        severity: "INFO",
        payload: {
          packId: pack.packId,
          insightScore: pack.score.overall,
          advisoryOnly: true,
        },
        executionTimeMs,
      });

      return pack;
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      const pack: InsightsPack = {
        packId: `insp:error:${Math.random().toString(36).slice(2, 8)}`,
        generatedAt: new Date().toISOString(),
        patterns: [],
        correlations: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        score: {
          patternQuality: 0,
          correlationStrength: 0,
          riskAccuracy: 0,
          opportunityValue: 0,
          recommendationConfidence: 0,
          evidenceQuality: 0,
          overall: 0,
        },
        topPriorities: [],
        warnings: [],
        errors: [`generateInsights failed: ${String(err)}`],
      };
      this.lastPack = pack;
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        patterns: 0,
        correlations: 0,
        recommendations: 0,
        insightScore: 0,
        averageConfidence: 0,
      });
      return pack;
    }
  }

  detectPatterns(options: GenerateInsightsOptions = {}) {
    try {
      return this.patternDetector.detect(this.resolveObservations(options));
    } catch (err) {
      return {
        patterns: [],
        warnings: [],
        errors: [`detectPatterns failed: ${String(err)}`],
      };
    }
  }

  analyzeCorrelations(options: GenerateInsightsOptions = {}) {
    try {
      return this.correlationEngine.analyze(this.resolveObservations(options));
    } catch (err) {
      return {
        correlations: [],
        warnings: [],
        errors: [`analyzeCorrelations failed: ${String(err)}`],
      };
    }
  }

  generateRecommendations(options: GenerateInsightsOptions = {}) {
    try {
      const pack = this.generateInsights(options);
      return {
        recommendations: pack.recommendations,
        warnings: pack.warnings,
        errors: pack.errors,
      };
    } catch (err) {
      return {
        recommendations: [],
        warnings: [],
        errors: [`generateRecommendations failed: ${String(err)}`],
      };
    }
  }

  getRiskInsights(options: GenerateInsightsOptions = {}) {
    try {
      const observations = this.resolveObservations(options);
      const patterns = this.patternDetector.detect(observations).patterns;
      const correlations =
        this.correlationEngine.analyze(observations).correlations;
      return this.riskEngine.analyze({
        observations,
        patterns,
        correlations,
      });
    } catch (err) {
      return {
        risks: [],
        warnings: [],
        errors: [`getRiskInsights failed: ${String(err)}`],
      };
    }
  }

  getInsightMetrics() {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  createInsightSnapshot(label?: string): InsightSnapshot {
    try {
      const pack =
        this.lastPack ??
        this.generateInsights({ includeLiveCollectors: false, observations: [] });
      const snapshot = this.snapshots.save(
        buildSnapshotPayload(pack, this.config.engineVersion),
        label
      );
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        insightScore: pack.score.overall,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch (err) {
      return this.snapshots.save(
        {
          score: {
            patternQuality: 0,
            correlationStrength: 0,
            riskAccuracy: 0,
            opportunityValue: 0,
            recommendationConfidence: 0,
            evidenceQuality: 0,
            overall: 0,
          },
          patternCount: 0,
          correlationCount: 0,
          riskCount: 0,
          opportunityCount: 0,
          recommendationCount: 0,
          averageRecommendationConfidence: 0,
          configurationVersion: this.config.engineVersion,
        },
        label ?? `error:${String(err)}`
      );
    }
  }

  compareInsightSnapshots(
    baselineId: string,
    compareId: string
  ): InsightSnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareInsightSnapshots(baseline, compare);
    } catch {
      return null;
    }
  }

  listSnapshots(): InsightSnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastPack(): InsightsPack | null {
    return this.lastPack;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastPack = null;
  }

  private resolveObservations(
    options: GenerateInsightsOptions = {}
  ): InsightObservation[] {
    const observations: InsightObservation[] = [
      ...(options.observations ?? []),
    ];
    if (options.includeLiveCollectors !== false) {
      try {
        observations.push(...collectAllInsightObservations());
      } catch {
        // never interrupt
      }
    }
    return observations;
  }
}

function safeCollect(
  sourceId: string,
  fn: () => InsightObservation[]
): InsightObservation[] {
  try {
    return fn();
  } catch {
    return [
      {
        sourceId: sourceId as InsightObservation["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        metadata: { unavailable: true },
      },
    ];
  }
}

export function buildBuiltinInsightSources(): InsightSourceDefinition[] {
  return [
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
                averageExecutionTime: number;
              };
            };
          };
          const m = getValidationOrchestrator().getMetrics();
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              validations: m.requests,
              failures: m.failed,
              runtimeMs: m.averageExecutionTime,
              pipelineId: "default",
              errorRate:
                m.requests === 0 ? 0 : (m.failed / m.requests) * 100,
            },
          ];
        }),
    },
    {
      id: "analytics",
      name: "Analytics Engine",
      collect: () =>
        safeCollect("analytics", () => {
          const { getValidationAnalyticsEngine } = require("../analytics") as {
            getValidationAnalyticsEngine: () => {
              getMetrics: () => {
                healthScore: number;
                averageRuntime: number;
              };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              healthScore: m.healthScore,
              runtimeMs: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "observability",
      name: "Observability Engine",
      collect: () =>
        safeCollect("observability", () => {
          const {
            getValidationObservabilityEngine,
          } = require("../observability") as {
            getValidationObservabilityEngine: () => {
              getObservabilityMetrics: () => {
                observabilityScore: number;
                averageCollectionTime: number;
              };
            };
          };
          const m = getValidationObservabilityEngine().getObservabilityMetrics();
          return [
            {
              sourceId: "observability",
              module: "observability",
              timestamp: new Date().toISOString(),
              healthScore: m.observabilityScore,
              runtimeMs: m.averageCollectionTime,
            },
          ];
        }),
    },
    {
      id: "diagnostics",
      name: "Diagnostics Engine",
      collect: () =>
        safeCollect("diagnostics", () => {
          const {
            getValidationDiagnosticsEngine,
          } = require("../diagnostics") as {
            getValidationDiagnosticsEngine: () => {
              getMetrics: () => {
                healthScore: number;
                averageRuntime: number;
              };
            };
          };
          const m = getValidationDiagnosticsEngine().getMetrics();
          return [
            {
              sourceId: "diagnostics",
              module: "diagnostics",
              timestamp: new Date().toISOString(),
              healthScore: m.healthScore,
              runtimeMs: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "optimization",
      name: "Optimization Engine",
      collect: () =>
        safeCollect("optimization", () => {
          const {
            getValidationOptimizationEngine,
          } = require("../optimization") as {
            getValidationOptimizationEngine: () => {
              getOptimizationMetrics: () => {
                optimizationScore: number;
                averageRuntime: number;
              };
            };
          };
          const m = getValidationOptimizationEngine().getOptimizationMetrics();
          return [
            {
              sourceId: "optimization",
              module: "optimization",
              timestamp: new Date().toISOString(),
              healthScore: m.optimizationScore,
              runtimeMs: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "reliability",
      name: "Reliability Engine",
      collect: () =>
        safeCollect("reliability", () => {
          const {
            getValidationReliabilityEngine,
          } = require("../reliability") as {
            getValidationReliabilityEngine: () => {
              getReliabilityMetrics: () => {
                availability: number;
                resilienceScore: number;
                retryCount: number;
                timeoutCount: number;
              };
            };
          };
          const m = getValidationReliabilityEngine().getReliabilityMetrics();
          return [
            {
              sourceId: "reliability",
              module: "reliability",
              timestamp: new Date().toISOString(),
              availability: m.availability,
              healthScore: m.resilienceScore,
              retries: m.retryCount,
              timeouts: m.timeoutCount,
            },
          ];
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect("trust", () => {
          const { getTrustScoreEngine } = require("../trust") as {
            getTrustScoreEngine: () => {
              getTrustMetrics: () => {
                averageTrustScore: number;
                averageValidationRuntime: number;
              };
            };
          };
          const m = getTrustScoreEngine().getTrustMetrics();
          return [
            {
              sourceId: "trust",
              module: "trust",
              timestamp: new Date().toISOString(),
              trustScore: m.averageTrustScore,
              runtimeMs: m.averageValidationRuntime,
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
              historicalScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          return [
            {
              sourceId: "historical",
              module: "historical",
              timestamp: new Date().toISOString(),
              historicalScore: m.historicalScore,
              runtimeMs: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "reporting",
      name: "Reporting Engine",
      collect: () =>
        safeCollect("reporting", () => {
          const { getValidationReportingEngine } = require("../reporting") as {
            getValidationReportingEngine: () => {
              getMetrics: () => { averageGenerationTime: number };
            };
          };
          const m = getValidationReportingEngine().getMetrics();
          return [
            {
              sourceId: "reporting",
              module: "reporting",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageGenerationTime,
              healthScore: 100,
            },
          ];
        }),
    },
    {
      id: "admin",
      name: "Administration Engine",
      collect: () =>
        safeCollect("admin", () => {
          const {
            getValidationAdministrationEngine,
          } = require("../admin") as {
            getValidationAdministrationEngine: () => {
              getAdministrationMetrics: () => { policies: number };
            };
          };
          getValidationAdministrationEngine().getAdministrationMetrics();
          return [
            {
              sourceId: "admin",
              module: "admin",
              timestamp: new Date().toISOString(),
              healthScore: 100,
            },
          ];
        }),
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      collect: () =>
        safeCollect("dashboard", () => {
          const {
            getValidationDashboardService,
          } = require("../dashboard") as {
            getValidationDashboardService: () => {
              getDashboardMetrics: () => {
                averageAggregationTime: number;
                cacheHitPercent: number;
              };
            };
          };
          const m = getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageAggregationTime,
              cacheHitRate: m.cacheHitPercent,
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
                  averageRuntime: number;
                  failureRate: number;
                };
                getCacheStats: () => { hits: number; misses: number };
              };
            };
          };
          const engine = getDataIntegrityEngine().getRuleEngine();
          const agg = engine.getAggregateMetrics();
          const cache = engine.getCacheStats();
          const total = cache.hits + cache.misses;
          return [
            {
              sourceId: "ruleEngine",
              module: "ruleEngine",
              timestamp: new Date().toISOString(),
              validations: agg.totalExecutions,
              runtimeMs: agg.averageRuntime,
              errorRate: agg.failureRate,
              failures: Math.round((agg.failureRate / 100) * agg.totalExecutions),
              cacheHitRate: total === 0 ? 100 : (cache.hits / total) * 100,
              ruleId: "aggregate",
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinInsightSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinInsightSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredInsightSources().length,
      total: getRegisteredInsightSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinInsightSources()) {
    const result = registerInsightSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinInsightSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredInsightSources().length,
  };
}

export interface IntelligenceRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationIntelligenceEngine(options?: {
  engine?: ValidationIntelligenceEngine;
  config?: InsightsConfigurationInput;
  force?: boolean;
}): IntelligenceRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredInsightSources().length,
    };
  }

  const sources = registerBuiltinInsightSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationIntelligenceEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationIntelligenceEngine(
  options?: InsightsConfigurationInput
): ValidationIntelligenceEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationIntelligenceEngine(options);
    registerBuiltinInsightSources();
  }
  return defaultEngine;
}

export function resetValidationIntelligenceEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetInsightSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function generateInsights(options?: GenerateInsightsOptions) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().generateInsights(options);
}

export function detectPatterns(options?: GenerateInsightsOptions) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().detectPatterns(options);
}

export function analyzeCorrelations(options?: GenerateInsightsOptions) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().analyzeCorrelations(options);
}

export function generateRecommendations(options?: GenerateInsightsOptions) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().generateRecommendations(options);
}

export function getRiskInsights(options?: GenerateInsightsOptions) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().getRiskInsights(options);
}

export function getInsightMetrics() {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().getInsightMetrics();
}

export function createInsightSnapshot(label?: string) {
  registerValidationIntelligenceEngine();
  return getValidationIntelligenceEngine().createInsightSnapshot(label);
}

export {
  DEFAULT_INSIGHTS_CONFIGURATION,
  resolveInsightsConfiguration,
  registerInsightSource,
};
