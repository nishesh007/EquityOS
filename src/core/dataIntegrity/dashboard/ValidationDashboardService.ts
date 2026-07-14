/**
 * Institutional Validation Dashboard Service — master façade (Prompt 9F.11).
 * Aggregates every validation engine into one monitoring backend.
 * Does not modify existing validation engines or Rule Engine.
 */

import {
  DEFAULT_DASHBOARD_CONFIGURATION,
  resolveDashboardConfiguration,
  type DashboardConfiguration,
  type DashboardConfigurationInput,
} from "./DashboardConfiguration";
import {
  DashboardAggregator,
  safeCollect,
  safeNumber,
  type AggregationExtras,
  type AggregationResult,
  type TopFailuresReport,
  type ValidationDistribution,
} from "./DashboardAggregator";
import {
  areBuiltinDashboardModulesRegistered,
  collectAllModuleMetrics,
  getRegisteredDashboardModules,
  markBuiltinDashboardModulesRegistered,
  registerDashboardModule,
  resetDashboardModuleRegistrationState,
  type DashboardModuleDefinition,
  type DashboardModuleRawMetrics,
} from "./DashboardRegistry";
import { DashboardCache } from "./DashboardCache";
import { DashboardAuditLogger } from "./DashboardAuditLogger";
import { DashboardEvents } from "./DashboardEvents";
import { DashboardMetricsTracker } from "./DashboardMetrics";
import {
  DashboardTrendAnalyzer,
  type DashboardTrendAnalysis,
  type DashboardTrendPoint,
} from "./DashboardTrendAnalyzer";
import {
  compareDashboardSnapshots,
  createDashboardSnapshotId,
  DashboardSnapshotStore,
  type DashboardSnapshot,
  type DashboardSnapshotComparison,
} from "./DashboardSnapshot";
import type { DashboardFilters } from "./DashboardFilters";
import type {
  DashboardSummary,
  DashboardSystemHealth,
} from "./DashboardSummary";
import type { DashboardOperationalMetrics } from "./DashboardMetrics";
import {
  getAuditHistory,
  getDataIntegrityEngine,
  getMetrics,
} from "../DataIntegrityEngine";
import { getMarketValidationMetrics } from "../rules/market";
import { getTechnicalValidationMetrics } from "../rules/technical";
import { getFundamentalValidationMetrics } from "../rules/fundamental";
import {
  getRecommendationAuditLog,
  getRecommendationValidationMetrics,
} from "../rules/recommendation";
import {
  getTradeSetupAuditLog,
  getTradeSetupValidationMetrics,
} from "../rules/tradeSetup";
import {
  getHallucinationAuditLog,
  getHallucinationValidationMetrics,
} from "../rules/hallucination";
import { getHistoricalValidationMetrics } from "../rules/historical";
import { getTrustMetrics, getTrustScoreEngine } from "../trust";
import { safePublishEvent } from "../events/ValidationEventBus";

const CACHE_SUMMARY = "dashboard:summary";
const CACHE_METRICS = "dashboard:metrics";
const CACHE_HEALTH = "dashboard:health";
const CACHE_DISTRIBUTION = "dashboard:distribution";
const CACHE_TOP_FAILURES = "dashboard:topFailures";

export interface DashboardQueryOptions {
  filters?: DashboardFilters;
  forceRefresh?: boolean;
  extras?: AggregationExtras;
}

export interface DashboardRegistrationResult {
  registered: boolean;
  skipped: boolean;
  modulesRegistered: number;
}

let defaultService: ValidationDashboardService | null = null;
let serviceRegistered = false;
let backgroundTimer: ReturnType<typeof setInterval> | null = null;

export class ValidationDashboardService {
  private config: DashboardConfiguration;
  private aggregator: DashboardAggregator;
  private cache: DashboardCache;
  private audit: DashboardAuditLogger;
  private events: DashboardEvents;
  private metrics: DashboardMetricsTracker;
  private trends: DashboardTrendAnalyzer;
  private snapshots: DashboardSnapshotStore;
  private previousOverallHealth: number | null = null;
  private lastTrustAverage: number | null = null;
  private lastAggregation: AggregationResult | null = null;

  constructor(configInput?: DashboardConfigurationInput) {
    this.config = resolveDashboardConfiguration(configInput);
    this.aggregator = new DashboardAggregator(this.config);
    this.cache = new DashboardCache(this.config.cacheTtlMs);
    this.audit = new DashboardAuditLogger(this.config.maxAuditEntries);
    this.events = new DashboardEvents();
    this.metrics = new DashboardMetricsTracker();
    this.trends = new DashboardTrendAnalyzer(this.config);
    this.snapshots = new DashboardSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): DashboardConfiguration {
    return resolveDashboardConfiguration(this.config);
  }

  updateConfiguration(input: DashboardConfigurationInput): void {
    this.config = resolveDashboardConfiguration({
      ...this.config,
      ...input,
      trendWindows: {
        ...this.config.trendWindows,
        ...(input.trendWindows ?? {}),
      },
      healthThresholds: {
        ...this.config.healthThresholds,
        ...(input.healthThresholds ?? {}),
      },
      healthWeights: {
        ...this.config.healthWeights,
        ...(input.healthWeights ?? {}),
      },
    });
    this.aggregator = new DashboardAggregator(this.config);
    this.cache.setTtl(this.config.cacheTtlMs);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
    this.trends = new DashboardTrendAnalyzer(this.config);
    this.cache.invalidate();
  }

  getEvents(): DashboardEvents {
    return this.events;
  }

  /** Core refresh — aggregates all registered modules. */
  refresh(options?: DashboardQueryOptions): AggregationResult {
    const started = Date.now();
    const cacheKey = this.cacheKey(CACHE_SUMMARY, options?.filters);

    if (!options?.forceRefresh) {
      const cached = this.cache.get<AggregationResult>(cacheKey);
      if (cached) {
        this.recordRefresh(started, true, cached);
        return cached;
      }
    }

    const extras: AggregationExtras = {
      ...(options?.extras ?? this.collectLiveExtras()),
      previousOverallHealth: this.previousOverallHealth,
    };

    const result = this.aggregator.aggregate({
      modules: collectAllModuleMetrics(),
      extras,
      filters: options?.filters,
    });

    this.cache.set(cacheKey, result);
    this.cache.set(this.cacheKey(CACHE_HEALTH, options?.filters), result.summary.health);
    this.cache.set(
      this.cacheKey(CACHE_DISTRIBUTION, options?.filters),
      result.distribution
    );
    this.cache.set(
      this.cacheKey(CACHE_TOP_FAILURES, options?.filters),
      result.topFailures
    );

    this.emitLifecycleEvents(result);
    this.recordTrendPoint(result);
    this.lastAggregation = result;
    this.previousOverallHealth = result.summary.health.overallHealthScore;

    const runtime = Date.now() - started;
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "DashboardRefresh",
      executionTimeMs: runtime,
      moduleCount: result.summary.modules.length,
      validationCount: result.summary.summary.totalValidations,
      healthScore: result.summary.health.overallHealthScore,
      warnings: result.warnings,
      errors: [],
      engineVersion: this.config.engineVersion,
      cacheHit: false,
    });

    this.recordRefresh(started, false, result);
    this.events.emit("DashboardUpdated", {
      healthScore: result.summary.health.overallHealthScore,
      validationCount: result.summary.summary.totalValidations,
    });
    safePublishEvent({
      eventType: "DashboardRefreshed",
      module: "dashboard",
      payload: {
        healthScore: result.summary.health.overallHealthScore,
        validationCount: result.summary.summary.totalValidations,
      },
      executionTimeMs: runtime,
      source: "dashboard",
    });

    return result;
  }

  getDashboardSummary(options?: DashboardQueryOptions): DashboardSummary {
    return this.refresh(options).summary;
  }

  getDashboardMetrics(): DashboardOperationalMetrics {
    const cacheStats = this.cache.getStats();
    const base = this.metrics.getMetrics();
    return {
      ...base,
      cacheHitPercent: cacheStats.hitPercent,
      cacheMissPercent: cacheStats.missPercent,
      moduleCount: getRegisteredDashboardModules().length,
      snapshotCount: this.snapshots.size,
    };
  }

  getDashboardHealth(options?: DashboardQueryOptions): DashboardSystemHealth {
    if (!options?.forceRefresh) {
      const cached = this.cache.get<DashboardSystemHealth>(
        this.cacheKey(CACHE_HEALTH, options?.filters)
      );
      if (cached) return cached;
    }
    return this.refresh(options).summary.health;
  }

  getValidationDistribution(
    options?: DashboardQueryOptions
  ): ValidationDistribution {
    if (!options?.forceRefresh) {
      const cached = this.cache.get<ValidationDistribution>(
        this.cacheKey(CACHE_DISTRIBUTION, options?.filters)
      );
      if (cached) return cached;
    }
    return this.refresh(options).distribution;
  }

  getTopFailures(options?: DashboardQueryOptions): TopFailuresReport {
    if (!options?.forceRefresh) {
      const cached = this.cache.get<TopFailuresReport>(
        this.cacheKey(CACHE_TOP_FAILURES, options?.filters)
      );
      if (cached) return cached;
    }
    return this.refresh(options).topFailures;
  }

  getDashboardTrend(): DashboardTrendAnalysis | null {
    if (!this.lastAggregation) return null;
    const point = this.toTrendPoint(this.lastAggregation);
    return this.trends.analyze(point);
  }

  createSnapshot(
    label?: string,
    options?: { fromLastAggregation?: boolean }
  ): DashboardSnapshot {
    const result =
      options?.fromLastAggregation && this.lastAggregation
        ? this.lastAggregation
        : this.refresh({ forceRefresh: true });
    const snapshot: DashboardSnapshot = {
      snapshotId: createDashboardSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      summary: result.summary,
      distribution: result.distribution,
      topFailures: result.topFailures,
      trend: this.getDashboardTrend(),
      engineVersion: this.config.engineVersion,
    };
    this.snapshots.save(snapshot);
    this.metrics.setSnapshotCount(this.snapshots.size);
    this.events.emit("SnapshotCreated", {
      snapshotId: snapshot.snapshotId,
      healthScore: snapshot.summary.health.overallHealthScore,
    });
    safePublishEvent({
      eventType: "SnapshotCreated",
      module: "dashboard",
      entityId: snapshot.snapshotId,
      payload: {
        snapshotId: snapshot.snapshotId,
        healthScore: snapshot.summary.health.overallHealthScore,
        label,
      },
      source: "dashboard",
    });
    this.audit.append({
      timestamp: snapshot.timestamp,
      event: "SnapshotCreate",
      executionTimeMs: result.aggregationTimeMs,
      moduleCount: result.summary.modules.length,
      validationCount: result.summary.summary.totalValidations,
      healthScore: result.summary.health.overallHealthScore,
      warnings: result.warnings,
      errors: [],
      engineVersion: this.config.engineVersion,
    });
    return snapshot;
  }

  loadSnapshot(snapshotId: string): DashboardSnapshot | null {
    const snapshot = this.snapshots.load(snapshotId);
    if (snapshot) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotLoad",
        executionTimeMs: 0,
        moduleCount: snapshot.summary.modules.length,
        validationCount: snapshot.summary.summary.totalValidations,
        healthScore: snapshot.summary.health.overallHealthScore,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
    }
    return snapshot;
  }

  compareSnapshots(
    baselineId: string,
    compareId: string
  ): DashboardSnapshotComparison | null {
    const baseline = this.snapshots.load(baselineId);
    const compare = this.snapshots.load(compareId);
    if (!baseline || !compare) return null;
    return compareDashboardSnapshots(baseline, compare);
  }

  listSnapshots(): DashboardSnapshot[] {
    return this.snapshots.list();
  }

  registerModule(
    definition: DashboardModuleDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    const result = registerDashboardModule(definition, options);
    if (result.registered) this.cache.invalidate();
    return result;
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  /** Incremental refresh — skip work when cache is still fresh. */
  incrementalRefresh(): { refreshed: boolean; result: AggregationResult } {
    const { value, refreshed } = this.cache.incrementalRefresh(
      CACHE_SUMMARY,
      () => this.refresh({ forceRefresh: true })
    );
    return { refreshed, result: value };
  }

  startBackgroundRefresh(): void {
    if (!this.config.backgroundRefreshEnabled) return;
    this.stopBackgroundRefresh();
    backgroundTimer = setInterval(() => {
      try {
        this.incrementalRefresh();
      } catch {
        // Background refresh must never crash the process.
      }
    }, this.config.refreshIntervalMs);
    if (typeof backgroundTimer === "object" && "unref" in backgroundTimer) {
      backgroundTimer.unref?.();
    }
  }

  stopBackgroundRefresh(): void {
    if (backgroundTimer) {
      clearInterval(backgroundTimer);
      backgroundTimer = null;
    }
  }

  resetOperationalState(): void {
    this.cache.clear();
    this.audit.reset();
    this.metrics.reset();
    this.trends.clear();
    this.snapshots.clear();
    this.events.reset();
    this.previousOverallHealth = null;
    this.lastTrustAverage = null;
    this.lastAggregation = null;
  }

  /** Test / injection helper — aggregate supplied module metrics directly. */
  aggregateOverride(
    modules: DashboardModuleRawMetrics[],
    extras?: AggregationExtras,
    filters?: DashboardFilters
  ): AggregationResult {
    const result = this.aggregator.aggregate({
      modules,
      extras: {
        ...extras,
        previousOverallHealth: this.previousOverallHealth,
      },
      filters,
    });
    this.emitLifecycleEvents(result);
    this.recordTrendPoint(result);
    this.lastAggregation = result;
    this.previousOverallHealth = result.summary.health.overallHealthScore;
    this.events.emit("DashboardUpdated", {
      healthScore: result.summary.health.overallHealthScore,
      validationCount: result.summary.summary.totalValidations,
    });
    return result;
  }

  private cacheKey(base: string, filters?: DashboardFilters): string {
    if (!filters || Object.keys(filters).length === 0) return base;
    return `${base}:${JSON.stringify(filters)}`;
  }

  private recordRefresh(
    started: number,
    cacheHit: boolean,
    result: AggregationResult
  ): void {
    const cacheStats = this.cache.getStats();
    this.metrics.recordRefresh({
      runtimeMs: Date.now() - started,
      moduleCount: result.summary.modules.length,
      cacheHitPercent: cacheStats.hitPercent,
      cacheMissPercent: cacheStats.missPercent,
    });
    this.metrics.setSnapshotCount(this.snapshots.size);
    if (cacheHit) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DashboardRefresh",
        executionTimeMs: Date.now() - started,
        moduleCount: result.summary.modules.length,
        validationCount: result.summary.summary.totalValidations,
        healthScore: result.summary.health.overallHealthScore,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
        cacheHit: true,
      });
    }
  }

  private emitLifecycleEvents(result: AggregationResult): void {
    const health = result.summary.health;
    if (
      this.previousOverallHealth !== null &&
      classifyChanged(this.previousOverallHealth, health.overallHealthScore, this.config)
    ) {
      this.events.emit("HealthChanged", {
        previous: this.previousOverallHealth,
        current: health.overallHealthScore,
        classification: health.overallClassification,
      });
    }

    if (result.summary.summary.criticalCount > 0) {
      this.events.emit("CriticalFailureDetected", {
        criticalCount: result.summary.summary.criticalCount,
        modules: result.summary.modules
          .filter((m) => m.criticalCount > 0)
          .map((m) => m.moduleId),
      });
    }

    const trustAvg = result.summary.summary.averageTrustScore;
    if (
      this.lastTrustAverage !== null &&
      Math.abs(this.lastTrustAverage - trustAvg) >= 1
    ) {
      this.events.emit("TrustChanged", {
        previous: this.lastTrustAverage,
        current: trustAvg,
      });
    }
    this.lastTrustAverage = trustAvg;
  }

  private recordTrendPoint(result: AggregationResult): void {
    this.trends.record(this.toTrendPoint(result));
  }

  private toTrendPoint(result: AggregationResult): DashboardTrendPoint {
    return {
      timestamp: result.summary.summary.generatedAt,
      healthScore: result.summary.health.overallHealthScore,
      averageIntegrityScore: result.summary.summary.averageIntegrityScore,
      averageTrustScore: result.summary.summary.averageTrustScore,
      totalValidations: result.summary.summary.totalValidations,
      failedValidations: result.summary.summary.failedValidations,
    };
  }

  private collectLiveExtras(): AggregationExtras {
    return collectLiveAggregationExtras();
  }
}

function classifyChanged(
  previous: number,
  current: number,
  config: DashboardConfiguration
): boolean {
  return Math.abs(previous - current) >= config.deteriorationDropThreshold / 2;
}

/** Register built-in collectors that read live engine metrics without mutating them. */
export function registerBuiltinDashboardModules(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinDashboardModulesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredDashboardModules().length,
      total: getRegisteredDashboardModules().length,
    };
  }

  const builtins = buildBuiltinDashboardModules();
  let added = 0;
  let skipped = 0;
  for (const def of builtins) {
    const result = registerDashboardModule(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinDashboardModulesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredDashboardModules().length,
  };
}

export function buildBuiltinDashboardModules(): DashboardModuleDefinition[] {
  return [
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      collect: () =>
        safeCollect(() => {
          const m = getMetrics();
          return {
            moduleId: "dataIntegrity",
            moduleName: "Data Integrity Engine",
            validationCount: safeNumber(m.datasetsValidated),
            passedCount: safeNumber(m.datasetsApproved),
            failedCount: safeNumber(m.datasetsRejected),
            warningCount: safeNumber(m.warningCount),
            criticalCount: safeNumber(m.criticalErrors),
            averageScore: safeNumber(m.averageIntegrityScore),
            averageRuntime: safeNumber(m.averageExecutionTime),
            lastValidation: m.lastValidatedAt,
          };
        }),
    },
    {
      id: "ruleEngine",
      name: "Rule Engine",
      collect: () =>
        safeCollect(() => {
          const agg = getDataIntegrityEngine()
            .getRuleEngine()
            .getAggregateMetrics();
          const total = safeNumber(agg.totalExecutions);
          const successPct = safeNumber(agg.successRate);
          const failurePct = safeNumber(agg.failureRate);
          return {
            moduleId: "ruleEngine",
            moduleName: "Rule Engine",
            validationCount: total,
            passedCount: Math.round((successPct / 100) * total),
            failedCount: Math.round((failurePct / 100) * total),
            warningCount: 0,
            criticalCount: 0,
            averageScore: successPct || 100,
            averageRuntime: safeNumber(agg.averageRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "market",
      name: "Market Validation",
      collect: () =>
        safeCollect(() => {
          const m = getMarketValidationMetrics();
          const total = safeNumber(m.marketDatasetsValidated);
          const failed = safeNumber(m.rejectedDatasets);
          return {
            moduleId: "market",
            moduleName: "Market Validation",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.warningCount),
            criticalCount: safeNumber(m.criticalFailures),
            averageScore:
              total === 0
                ? 100
                : clampPct(((total - failed) / Math.max(total, 1)) * 100),
            averageRuntime: safeNumber(m.averageExecutionTime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "technical",
      name: "Technical Validation",
      collect: () =>
        safeCollect(() => {
          const m = getTechnicalValidationMetrics();
          const total = safeNumber(m.indicatorsValidated);
          const failed = safeNumber(m.failedIndicators);
          return {
            moduleId: "technical",
            moduleName: "Technical Validation",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.warnings),
            criticalCount: safeNumber(m.criticalFailures),
            averageScore:
              total === 0
                ? 100
                : clampPct(((total - failed) / Math.max(total, 1)) * 100),
            averageRuntime: safeNumber(m.averageRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "fundamental",
      name: "Fundamental Validation",
      collect: () =>
        safeCollect(() => {
          const m = getFundamentalValidationMetrics();
          const total = safeNumber(m.companiesValidated);
          const failed =
            safeNumber(m.ratioFailures) + safeNumber(m.accountingAnomalies);
          return {
            moduleId: "fundamental",
            moduleName: "Fundamental Validation",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.accountingAnomalies),
            criticalCount: safeNumber(m.ratioFailures),
            averageScore:
              total === 0
                ? 100
                : clampPct(((total - failed) / Math.max(total, 1)) * 100),
            averageRuntime: safeNumber(m.averageExecutionTime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "recommendation",
      name: "Recommendation Validation",
      collect: () =>
        safeCollect(() => {
          const m = getRecommendationValidationMetrics();
          const total = safeNumber(m.recommendationsValidated);
          const failed = safeNumber(m.rejected);
          return {
            moduleId: "recommendation",
            moduleName: "Recommendation Validation",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.warnings),
            criticalCount: 0,
            averageScore: safeNumber(m.averageQualityScore, 100),
            averageRuntime: safeNumber(m.averageValidationTime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "tradeSetup",
      name: "Trade Setup Validation",
      collect: () =>
        safeCollect(() => {
          const m = getTradeSetupValidationMetrics();
          const total = safeNumber(m.tradeSetupsValidated);
          const failed = safeNumber(m.rejectedSetups);
          return {
            moduleId: "tradeSetup",
            moduleName: "Trade Setup Validation",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.riskViolations),
            criticalCount: 0,
            averageScore: safeNumber(m.averageQualityScore, 100),
            averageRuntime: safeNumber(m.averageValidationRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "hallucination",
      name: "Hallucination Detection",
      collect: () =>
        safeCollect(() => {
          const m = getHallucinationValidationMetrics();
          const total = safeNumber(m.aiOutputsValidated);
          const failed = safeNumber(m.hallucinationsDetected);
          return {
            moduleId: "hallucination",
            moduleName: "Hallucination Detection",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: safeNumber(m.contradictions),
            criticalCount: failed,
            averageScore: safeNumber(m.averageHallucinationScore, 100),
            averageRuntime: safeNumber(m.averageValidationRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "historical",
      name: "Historical Performance",
      collect: () =>
        safeCollect(() => {
          const m = getHistoricalValidationMetrics();
          const total =
            safeNumber(m.recommendationsAnalysed) +
            safeNumber(m.tradesAnalysed);
          return {
            moduleId: "historical",
            moduleName: "Historical Performance",
            validationCount: total,
            passedCount: total,
            failedCount: 0,
            warningCount: 0,
            criticalCount: 0,
            averageScore: safeNumber(m.historicalScore, 100),
            averageRuntime: safeNumber(m.averageValidationRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect(() => {
          const m = getTrustMetrics();
          const total = safeNumber(m.totalCalculations);
          const failed = safeNumber(m.rejectedObjects);
          return {
            moduleId: "trust",
            moduleName: "Trust Engine",
            validationCount: total,
            passedCount: Math.max(0, total - failed),
            failedCount: failed,
            warningCount: 0,
            criticalCount: 0,
            averageScore: safeNumber(m.averageTrustScore, 100),
            averageRuntime: safeNumber(m.averageValidationRuntime),
            lastValidation: total > 0 ? new Date().toISOString() : null,
          };
        }),
    },
  ];
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function collectLiveAggregationExtras(): AggregationExtras {
  const extras: AggregationExtras = {
    ruleFailureFrequency: {},
    rejectedDatasets: {},
    hallucinationRisks: [],
    trustScores: [],
    integrityScores: [],
    recommendationScores: [],
    tradeSetupScores: [],
    ruleCategories: {},
    severities: {},
    datasetTypes: {},
    timeframes: {},
    recommendationTypes: {},
  };

  try {
    Object.assign(
      extras.ruleFailureFrequency!,
      getRecommendationValidationMetrics().ruleFailureFrequency ?? {}
    );
    for (const entry of getRecommendationAuditLog()) {
      extras.recommendationScores!.push({
        key: String(entry.recommendation ?? entry.timestamp),
        score: entry.qualityScore,
        recommendation: String(entry.recommendation ?? ""),
      });
      if (entry.recommendation) {
        const key = String(entry.recommendation);
        extras.recommendationTypes![key] =
          (extras.recommendationTypes![key] ?? 0) + 1;
      }
    }
  } catch {
    /* optional source */
  }

  try {
    Object.assign(
      extras.ruleFailureFrequency!,
      getTradeSetupValidationMetrics().ruleFailureFrequency ?? {}
    );
    for (const entry of getTradeSetupAuditLog()) {
      extras.tradeSetupScores!.push({
        key: entry.setupId ?? entry.validationTime,
        score: entry.qualityScore,
      });
    }
  } catch {
    /* optional source */
  }

  try {
    for (const entry of getHallucinationAuditLog()) {
      extras.hallucinationRisks!.push({
        key: entry.aiOutputId ?? entry.validationTimestamp,
        score: 100 - entry.hallucinationScore,
      });
    }
  } catch {
    /* optional source */
  }

  try {
    for (const entry of getTrustScoreEngine().getAuditLog()) {
      extras.trustScores!.push({
        key: entry.objectId,
        score: entry.trustScore,
        classification: entry.classification,
      });
    }
  } catch {
    /* optional source */
  }

  try {
    for (const entry of getAuditHistory(200)) {
      extras.datasetTypes![entry.datasetType] =
        (extras.datasetTypes![entry.datasetType] ?? 0) + 1;
      const cat = entry.ruleId.split(".")[0] ?? "unknown";
      extras.ruleCategories![cat] = (extras.ruleCategories![cat] ?? 0) + 1;
      if (entry.status === "FAILED") {
        extras.ruleFailureFrequency![entry.ruleId] =
          (extras.ruleFailureFrequency![entry.ruleId] ?? 0) + 1;
        const severity =
          entry.scoreImpact >= 40
            ? "CRITICAL"
            : entry.scoreImpact >= 10
              ? "ERROR"
              : "WARNING";
        extras.severities![severity] = (extras.severities![severity] ?? 0) + 1;
      }
    }
  } catch {
    /* optional source */
  }

  return extras;
}

/** Idempotent dashboard service startup registration. */
export function registerDashboardService(options?: {
  service?: ValidationDashboardService;
  config?: DashboardConfigurationInput;
  force?: boolean;
  startBackgroundRefresh?: boolean;
}): DashboardRegistrationResult {
  if (serviceRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      modulesRegistered: getRegisteredDashboardModules().length,
    };
  }

  const modules = registerBuiltinDashboardModules({ force: options?.force });
  if (options?.service) {
    defaultService = options.service;
  } else if (!defaultService || options?.config || options?.force) {
    defaultService = new ValidationDashboardService(options?.config);
  }

  if (options?.startBackgroundRefresh !== false) {
    defaultService.startBackgroundRefresh();
  }

  serviceRegistered = true;
  return {
    registered: true,
    skipped: false,
    modulesRegistered: modules.total,
  };
}

export function getValidationDashboardService(
  options?: DashboardConfigurationInput
): ValidationDashboardService {
  if (!defaultService || options) {
    defaultService = new ValidationDashboardService(options);
    registerBuiltinDashboardModules();
  }
  return defaultService;
}

export function resetValidationDashboardService(): void {
  if (defaultService) {
    defaultService.stopBackgroundRefresh();
    defaultService.resetOperationalState();
  }
  defaultService = null;
  serviceRegistered = false;
  resetDashboardModuleRegistrationState();
}

/** Public API convenience wrappers. */
export function getDashboardSummary(
  options?: DashboardQueryOptions
): DashboardSummary {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().getDashboardSummary(options);
}

export function getDashboardMetrics(): DashboardOperationalMetrics {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().getDashboardMetrics();
}

export function getDashboardHealth(
  options?: DashboardQueryOptions
): DashboardSystemHealth {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().getDashboardHealth(options);
}

export function getValidationDistribution(
  options?: DashboardQueryOptions
): ValidationDistribution {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().getValidationDistribution(options);
}

export function getTopFailures(
  options?: DashboardQueryOptions
): TopFailuresReport {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().getTopFailures(options);
}

export function createSnapshot(label?: string): DashboardSnapshot {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().createSnapshot(label);
}

export function loadSnapshot(snapshotId: string): DashboardSnapshot | null {
  registerDashboardService({ startBackgroundRefresh: false });
  return getValidationDashboardService().loadSnapshot(snapshotId);
}

export {
  DEFAULT_DASHBOARD_CONFIGURATION,
  resolveDashboardConfiguration,
  registerDashboardModule,
};
