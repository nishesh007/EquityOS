/**
 * Institutional Trust Score Engine — master façade.
 * Aggregates all validation engines into one unified trust framework.
 * Does not modify existing validation architecture or Rule Engine.
 */

import {
  DEFAULT_TRUST_CONFIGURATION,
  resolveTrustConfiguration,
  type TrustConfiguration,
  type TrustConfigurationInput,
} from "./TrustConfiguration";
import {
  classifyTrust,
  isTrustRejected,
  type TrustClassificationLabel,
} from "./TrustClassification";
import { TrustWeightManager } from "./TrustWeightManager";
import { TrustScoreCalculator } from "./TrustScoreCalculator";
import type {
  TrustAdjustmentSignals,
  TrustScoreCalculationResult,
} from "./TrustScoreCalculator";
import type { TrustModuleScoreMap } from "./TrustAggregationEngine";
import { TrustHistoryStore, type TrustHistoryEntry } from "./TrustHistory";
import { TrustTrendAnalyzer, type TrustTrendSnapshot } from "./TrustTrendAnalyzer";
import {
  createTrustSnapshotId,
  type TrustSnapshot,
} from "./TrustSnapshot";
import {
  TrustMetricsTracker,
  type TrustErrorReport,
  type TrustMetricsSnapshot,
} from "./TrustMetrics";
import { TrustAuditLogger, type TrustAuditEntry } from "./TrustAuditLogger";
import {
  extractAllModuleScores,
  getRegisteredTrustModules,
  registerBuiltinTrustModules,
  registerTrustModule,
  resetTrustModuleRegistrationState,
  type TrustModuleDefinition,
  type TrustModuleRegistrationResult,
} from "./TrustRuleRegistry";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface TrustScoreRequest {
  /** Stable object identifier (stock, recommendation, trade setup, AI report). */
  objectId: string;
  objectType?: string;
  /** Explicit module scores; merged with extracted scores from `payload`. */
  moduleScores?: TrustModuleScoreMap;
  /** Optional validated payload from which registered modules extract scores. */
  payload?: unknown;
  signals?: TrustAdjustmentSignals;
  warnings?: string[];
  failedRules?: string[];
  validationSummary?: string;
  /** Optional config override for this calculation. */
  config?: TrustConfigurationInput;
  /** Custom weight overrides for this calculation. */
  weights?: Partial<Record<string, number>>;
  timestamp?: string;
}

/**
 * Unified trust fields attached to every validated object (non-breaking additive shape).
 */
export interface TrustFields {
  trustScore: number;
  trustClassification: TrustClassificationLabel;
  trustTrend: TrustTrendSnapshot;
  trustConfidence: number;
  trustHistoryReference: string;
}

export interface TrustScoreResult extends TrustFields {
  objectId: string;
  objectType?: string;
  baseScore: number;
  moduleScores: Record<string, number>;
  weightDistribution: Record<string, number>;
  contributingModules: string[];
  warnings: string[];
  failedRules: string[];
  rejected: boolean;
  adjustmentsApplied: number;
  bonusesApplied: number;
  errorReports: TrustErrorReport[];
  engineVersion: string;
  timestamp: string;
  snapshot: TrustSnapshot;
}

export interface TrustEngineRegistrationResult {
  registered: boolean;
  skipped: boolean;
  modules: TrustModuleRegistrationResult;
}

let defaultEngine: TrustScoreEngine | null = null;
let engineRegistered = false;

export class TrustScoreEngine {
  private config: TrustConfiguration;
  private weightManager: TrustWeightManager;
  private calculator: TrustScoreCalculator;
  private history: TrustHistoryStore;
  private trends: TrustTrendAnalyzer;
  private metrics: TrustMetricsTracker;
  private audit: TrustAuditLogger;

  constructor(configInput?: TrustConfigurationInput) {
    this.config = resolveTrustConfiguration(configInput);
    this.weightManager = new TrustWeightManager(this.config.weights);
    this.calculator = new TrustScoreCalculator(this.config);
    this.history = new TrustHistoryStore(this.config);
    this.trends = new TrustTrendAnalyzer(this.config);
    this.metrics = new TrustMetricsTracker();
    this.audit = new TrustAuditLogger();
  }

  getConfiguration(): TrustConfiguration {
    return resolveTrustConfiguration(this.config);
  }

  updateConfiguration(input: TrustConfigurationInput): void {
    this.config = resolveTrustConfiguration({
      ...this.config,
      ...input,
      weights: { ...this.config.weights, ...(input.weights ?? {}) },
      classificationThresholds: {
        ...this.config.classificationThresholds,
        ...(input.classificationThresholds ?? {}),
      },
      trendWindows: {
        ...this.config.trendWindows,
        ...(input.trendWindows ?? {}),
      },
      confidenceAdjustments: {
        ...this.config.confidenceAdjustments,
        ...(input.confidenceAdjustments ?? {}),
      },
      bonusScoring: {
        ...this.config.bonusScoring,
        ...(input.bonusScoring ?? {}),
      },
    });
    this.weightManager = new TrustWeightManager(this.config.weights);
    this.calculator = new TrustScoreCalculator(this.config);
    this.history = new TrustHistoryStore(this.config);
    this.trends = new TrustTrendAnalyzer(this.config);
  }

  setWeights(weights: Partial<Record<string, number>>): void {
    this.weightManager.setWeights(weights);
    this.config = {
      ...this.config,
      weights: this.weightManager.getWeights() as TrustConfiguration["weights"],
    };
    this.calculator = new TrustScoreCalculator(this.config);
  }

  /** Generate Institutional Trust Score (0–100) and persist history/audit. */
  calculateTrustScore(request: TrustScoreRequest): TrustScoreResult {
    const started = Date.now();
    const config = request.config
      ? resolveTrustConfiguration({ ...this.config, ...request.config })
      : this.config;
    const calculator = request.config
      ? new TrustScoreCalculator(config)
      : this.calculator;
    const trendAnalyzer = request.config
      ? new TrustTrendAnalyzer(config)
      : this.trends;

    const extracted = request.payload
      ? extractAllModuleScores(request.payload)
      : {};
    const moduleScores: TrustModuleScoreMap = {
      ...extracted,
      ...(request.moduleScores ?? {}),
    };

    const priorHistory = this.history.getHistory(request.objectId);
    const previousScore =
      priorHistory.length > 0
        ? priorHistory[priorHistory.length - 1]!.trustScore
        : null;

    const calculated: TrustScoreCalculationResult = calculator.calculate({
      moduleScores,
      weights: request.weights ?? this.weightManager.getWeights(),
      signals: request.signals,
      previousScore,
    });

    const timestamp = request.timestamp ?? new Date().toISOString();
    const trustClassification = classifyTrust(
      calculated.trustScore,
      config.classificationThresholds
    );
    const rejected = isTrustRejected(
      calculated.trustScore,
      config.rejectThreshold
    );

    const trustTrend = trendAnalyzer.analyze(
      calculated.trustScore,
      priorHistory,
      new Date(timestamp)
    );

    const snapshotId = createTrustSnapshotId(request.objectId, timestamp);
    const snapshot: TrustSnapshot = {
      snapshotId,
      objectId: request.objectId,
      objectType: request.objectType,
      timestamp,
      trustScore: calculated.trustScore,
      trustClassification,
      trustConfidence: calculated.trustConfidence,
      moduleScores: calculated.aggregation.moduleScores,
      weightDistribution: calculated.aggregation.weightDistribution,
      validationSummary: request.validationSummary,
      warnings: [
        ...(request.warnings ?? []),
        ...calculated.warnings,
      ],
      failedRules: request.failedRules ?? [],
      trend: trustTrend,
      engineVersion: config.engineVersion,
    };

    const historyEntry: TrustHistoryEntry = {
      timestamp,
      trustScore: calculated.trustScore,
      trustClassification,
      validationSummary: request.validationSummary,
      moduleScores: calculated.aggregation.moduleScores,
      warnings: snapshot.warnings,
      failedRules: snapshot.failedRules,
      historicalSnapshot: snapshot,
    };

    const trustHistoryReference = this.history.append(
      request.objectId,
      historyEntry
    );

    this.audit.append({
      trustScore: calculated.trustScore,
      timestamp,
      objectId: request.objectId,
      objectType: request.objectType,
      contributingModules: calculated.aggregation.contributingModules,
      weightDistribution: calculated.aggregation.weightDistribution,
      warnings: snapshot.warnings,
      engineVersion: config.engineVersion,
      classification: trustClassification,
      adjustmentsApplied: calculated.adjustmentsApplied,
      bonusesApplied: calculated.bonusesApplied,
    });

    const runtimeMs = Date.now() - started;
    this.metrics.record({
      score: calculated.trustScore,
      classification: trustClassification,
      rejected,
      trendDelta: trustTrend.trend7d,
      runtimeMs,
    });

    safePublishEvent({
      eventType: "TrustScoreUpdated",
      module: "trust",
      entityId: request.objectId,
      payload: {
        trustScore: calculated.trustScore,
        trustClassification,
        rejected,
      },
      executionTimeMs: runtimeMs,
      source: "trust-engine",
      severity: rejected ? "WARNING" : "INFO",
    });

    return {
      objectId: request.objectId,
      objectType: request.objectType,
      trustScore: calculated.trustScore,
      trustClassification,
      trustTrend,
      trustConfidence: calculated.trustConfidence,
      trustHistoryReference,
      baseScore: calculated.baseScore,
      moduleScores: calculated.aggregation.moduleScores,
      weightDistribution: calculated.aggregation.weightDistribution,
      contributingModules: calculated.aggregation.contributingModules,
      warnings: snapshot.warnings,
      failedRules: snapshot.failedRules,
      rejected,
      adjustmentsApplied: calculated.adjustmentsApplied,
      bonusesApplied: calculated.bonusesApplied,
      errorReports: calculated.errorReports,
      engineVersion: config.engineVersion,
      timestamp,
      snapshot,
    };
  }

  getTrustHistory(objectId: string): TrustHistoryEntry[] {
    return this.history.getHistory(objectId);
  }

  getTrustMetrics(): TrustMetricsSnapshot {
    return this.metrics.getMetrics();
  }

  getTrustTrend(objectId: string): TrustTrendSnapshot | null {
    const latest = this.history.getLatest(objectId);
    if (!latest) return null;
    const history = this.history.getHistory(objectId);
    const prior = history.slice(0, -1);
    return this.trends.analyze(
      latest.trustScore,
      prior,
      new Date(latest.timestamp)
    );
  }

  classifyTrust(score: number): TrustClassificationLabel {
    return classifyTrust(score, this.config.classificationThresholds);
  }

  registerTrustModule(
    definition: TrustModuleDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    const result = registerTrustModule(definition, options);
    if (result.registered && definition.defaultWeight !== undefined) {
      this.weightManager.setWeight(definition.id, definition.defaultWeight);
      this.config = {
        ...this.config,
        weights: this.weightManager.getWeights() as TrustConfiguration["weights"],
      };
      this.calculator = new TrustScoreCalculator(this.config);
    }
    return result;
  }

  getAuditLog(objectId?: string): TrustAuditEntry[] {
    return this.audit.getLog(objectId);
  }

  getRegisteredModules(): TrustModuleDefinition[] {
    return getRegisteredTrustModules();
  }

  /**
   * Attach trust fields onto any validated object without mutating upstream APIs.
   * Returns a shallow copy with additive TrustFields.
   */
  attachTrustFields<T extends object>(
    object: T,
    request: Omit<TrustScoreRequest, "objectId"> & { objectId?: string }
  ): T & TrustFields {
    const objectId =
      request.objectId ??
      (typeof (object as { id?: unknown }).id === "string"
        ? ((object as { id: string }).id)
        : `anon-${Date.now()}`);
    const result = this.calculateTrustScore({ ...request, objectId });
    return {
      ...object,
      trustScore: result.trustScore,
      trustClassification: result.trustClassification,
      trustTrend: result.trustTrend,
      trustConfidence: result.trustConfidence,
      trustHistoryReference: result.trustHistoryReference,
    };
  }

  resetMetrics(): void {
    this.metrics.reset();
  }

  resetAuditLog(): void {
    this.audit.reset();
  }

  clearHistory(objectId?: string): void {
    this.history.clear(objectId);
  }
}

/** Idempotent Trust Engine startup registration. */
export function registerTrustEngine(options?: {
  engine?: TrustScoreEngine;
  config?: TrustConfigurationInput;
  force?: boolean;
}): TrustEngineRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      modules: {
        registered: 0,
        skipped: getRegisteredTrustModules().length,
        total: getRegisteredTrustModules().length,
      },
    };
  }

  const modules = registerBuiltinTrustModules({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new TrustScoreEngine(options?.config);
  }

  engineRegistered = true;
  return { registered: true, skipped: false, modules };
}

export function getTrustScoreEngine(
  options?: TrustConfigurationInput
): TrustScoreEngine {
  if (!defaultEngine || options) {
    defaultEngine = new TrustScoreEngine(options);
    registerBuiltinTrustModules();
  }
  return defaultEngine;
}

export function resetTrustScoreEngine(): void {
  defaultEngine = null;
  engineRegistered = false;
  resetTrustModuleRegistrationState();
}

/** Public API convenience wrappers bound to the default engine. */
export function calculateTrustScore(
  request: TrustScoreRequest
): TrustScoreResult {
  registerTrustEngine();
  return getTrustScoreEngine().calculateTrustScore(request);
}

export function getTrustHistory(objectId: string): TrustHistoryEntry[] {
  return getTrustScoreEngine().getTrustHistory(objectId);
}

export function getTrustMetrics(): TrustMetricsSnapshot {
  return getTrustScoreEngine().getTrustMetrics();
}

export function getTrustTrend(objectId: string): TrustTrendSnapshot | null {
  return getTrustScoreEngine().getTrustTrend(objectId);
}

export { classifyTrust, registerTrustModule };

export { DEFAULT_TRUST_CONFIGURATION, resolveTrustConfiguration };
