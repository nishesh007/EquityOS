/**
 * Institutional Validation Learning, Feedback & Continuous Improvement Engine — façade (Prompt 9F.29).
 * Advisory only: never automatically modifies validation logic, rules, or decisions.
 */

import {
  DEFAULT_LEARNING_CONFIGURATION,
  resolveLearningConfiguration,
  type LearningConfiguration,
  type LearningConfigurationInput,
} from "./LearningConfiguration";
import {
  areBuiltinLearningSourcesRegistered,
  createLearningSourceId,
  listLearningSources,
  markBuiltinLearningSourcesRegistered,
  registerLearningSource,
  resetLearningRegistry,
  type LearningSourceDefinition,
  type LearningSourceKind,
  type LearningSignalKind,
} from "./LearningRegistry";
import {
  FeedbackCollector,
  type CollectFeedbackInput,
  type FeedbackRecord,
} from "./FeedbackCollector";
import {
  PatternLearningEngine,
  type PatternLearningResult,
  type PatternObservation,
} from "./PatternLearningEngine";
import { TrendLearning } from "./TrendLearning";
import { RegressionLearning } from "./RegressionLearning";
import { RecommendationLearning } from "./RecommendationLearning";
import {
  ImprovementAnalyzer,
  type ImprovementAnalysisResult,
} from "./ImprovementAnalyzer";
import { LearningPlanner, type LearningPlan } from "./LearningPlanner";
import {
  LearningMetricsTracker,
  type LearningHealthScore,
  type LearningOperationalMetrics,
} from "./LearningMetrics";
import { LearningAuditLogger } from "./LearningAuditLogger";
import {
  LearningSnapshotStore,
  buildLearningSnapshotPayload,
  compareLearningSnapshots,
  type LearningSnapshot,
  type LearningSnapshotComparison,
  type LearningSnapshotKind,
} from "./LearningSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { LearningHealthScore };

export interface AnalyzePatternsOptions {
  observations?: PatternObservation[];
  includeFeedback?: boolean;
}

export interface GenerateImprovementsOptions extends AnalyzePatternsOptions {
  plan?: boolean;
}

export interface LearningRunResult {
  runId: string;
  patterns: PatternLearningResult;
  improvements: ImprovementAnalysisResult;
  plan: LearningPlan | null;
  healthScore: LearningHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationLearningEngine | null = null;
let engineRegistered = false;

export class ValidationLearningEngine {
  private config: LearningConfiguration;
  private feedback: FeedbackCollector;
  private patternEngine: PatternLearningEngine;
  private readonly trendLearning = new TrendLearning();
  private readonly regressionLearning = new RegressionLearning();
  private readonly recommendationLearning = new RecommendationLearning();
  private improvementAnalyzer: ImprovementAnalyzer;
  private readonly planner = new LearningPlanner();
  private readonly metrics = new LearningMetricsTracker();
  private audit: LearningAuditLogger;
  private snapshots: LearningSnapshotStore;
  private lastHealthScore: LearningHealthScore | null = null;
  private lastResult: LearningRunResult | null = null;
  private lastAverageImpact = 0;
  private runSeq = 0;

  constructor(configInput?: LearningConfigurationInput) {
    this.config = resolveLearningConfiguration(configInput);
    this.feedback = new FeedbackCollector(
      this.config.maxFeedbackRecords,
      this.config.feedbackWeights
    );
    this.patternEngine = new PatternLearningEngine(this.config);
    this.improvementAnalyzer = new ImprovementAnalyzer(this.config);
    this.audit = new LearningAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new LearningSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): LearningConfiguration {
    return resolveLearningConfiguration(this.config);
  }

  updateConfiguration(input: LearningConfigurationInput): void {
    this.config = resolveLearningConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
      feedbackWeights: {
        ...this.config.feedbackWeights,
        ...input.feedbackWeights,
      },
    });
    this.feedback.setMaxRecords(this.config.maxFeedbackRecords);
    this.feedback.setWeights(this.config.feedbackWeights);
    this.patternEngine.setConfiguration(this.config);
    this.improvementAnalyzer.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: Omit<LearningSourceDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerLearningSource(definition, options);
  }

  collectFeedback(input: CollectFeedbackInput): FeedbackRecord {
    try {
      const record = this.feedback.collect(input);
      this.metrics.setFeedbackCount(this.feedback.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "FeedbackCollected",
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return record;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: 0,
        warnings: [],
        errors: [`collectFeedback failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        feedbackId: `fb:error:${Date.now()}`,
        sourceType: input.sourceType,
        sentiment: input.sentiment ?? "neutral",
        message: input.message,
        weight: 0,
        score: 0,
        tags: [],
        createdAt: new Date().toISOString(),
      };
    }
  }

  analyzePatterns(
    options: AnalyzePatternsOptions = {}
  ): PatternLearningResult {
    const started = Date.now();
    try {
      const result = this.patternEngine.analyze({
        sources: listLearningSources(),
        feedback: options.includeFeedback === false ? [] : this.feedback.list(),
        observations: options.observations,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PatternsDetected",
        learningHealthScore: result.coverageScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        patterns: [],
        coverageScore: 0,
        warnings: [],
        errors: [`analyzePatterns failed: ${String(err)}`],
      };
    }
  }

  generateImprovements(
    options: GenerateImprovementsOptions = {}
  ): LearningRunResult {
    const started = Date.now();
    this.runSeq += 1;
    const runId = `learn:${this.runSeq}:${Date.now()}`;
    try {
      const patterns = this.analyzePatterns(options);
      const feedback = this.feedback.list();
      const trends = this.trendLearning.analyze({
        feedback,
        patterns: patterns.patterns,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "TrendAnalyzed",
        runId,
        learningHealthScore: trends.detectionScore,
        executionTimeMs: 0,
        warnings: trends.warnings,
        errors: trends.errors,
        engineVersion: this.config.engineVersion,
      });

      const previousScore = this.lastHealthScore?.overall;
      const recommendations = this.recommendationLearning.learn({
        patterns: patterns.patterns,
        trends,
        feedback,
      });
      const improvements = this.improvementAnalyzer.analyze({
        recommendations: recommendations.recommendations,
        patterns: patterns.patterns,
        feedback,
      });
      this.lastAverageImpact = improvements.averageImpact;

      const provisionalScore = this.computeHealthScore({
        patternCoverage: patterns.coverageScore,
        feedbackCoverage: this.feedback.coverageScore(),
        trendDetection: trends.detectionScore,
        recommendationQuality: Math.round(
          (recommendations.qualityScore + improvements.qualityScore) / 2
        ),
        regressionLearning: 50,
      });

      const regression = this.regressionLearning.analyze({
        patterns: patterns.patterns,
        trends,
        previousScore,
        currentScore: provisionalScore.overall,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "RegressionLearned",
        runId,
        learningHealthScore: regression.learningScore,
        executionTimeMs: 0,
        warnings: regression.warnings,
        errors: regression.errors,
        engineVersion: this.config.engineVersion,
      });

      const healthScore = this.computeHealthScore({
        patternCoverage: patterns.coverageScore,
        feedbackCoverage: this.feedback.coverageScore(),
        trendDetection: trends.detectionScore,
        recommendationQuality: Math.round(
          (recommendations.qualityScore + improvements.qualityScore) / 2
        ),
        regressionLearning: regression.learningScore,
      });
      this.lastHealthScore = healthScore;

      const plan =
        options.plan === false
          ? null
          : this.planner.plan({
              improvements: improvements.improvements,
              trends,
            });

      const warnings = [
        ...patterns.warnings,
        ...trends.warnings,
        ...recommendations.warnings,
        ...improvements.warnings,
        ...regression.warnings,
        ...(plan?.warnings ?? []),
      ];
      const errors = [
        ...patterns.errors,
        ...trends.errors,
        ...recommendations.errors,
        ...improvements.errors,
        ...regression.errors,
        ...(plan?.errors ?? []),
      ];

      this.metrics.recordLearningRun({
        patternsFound: patterns.patterns.length,
        improvements: improvements.improvements.length,
        runtimeMs: Date.now() - started,
        healthScore: healthScore.overall,
      });
      this.metrics.setFeedbackCount(this.feedback.size);
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ImprovementsGenerated",
        runId,
        learningHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: improvements.warnings,
        errors: improvements.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "LearningRun",
        runId,
        learningHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "LearningScoreComputed",
        runId,
        learningHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "learning",
        source: "learning-engine",
        severity: errors.length > 0 ? "WARNING" : "INFO",
        payload: {
          runId,
          advisoryOnly: true,
          noValidationMutation: true,
          healthScore: healthScore.overall,
          improvements: improvements.improvements.length,
        },
        executionTimeMs: Date.now() - started,
      });

      const result: LearningRunResult = {
        runId,
        patterns,
        improvements,
        plan,
        healthScore,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
      this.lastResult = result;
      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        runId,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`generateImprovements failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        runId,
        patterns: { patterns: [], coverageScore: 0, warnings: [], errors: [] },
        improvements: {
          improvements: [],
          backlog: [],
          averageImpact: 0,
          averageConfidence: 0,
          qualityScore: 0,
          warnings: [],
          errors: [`generateImprovements failed: ${String(err)}`],
        },
        plan: null,
        healthScore: zeroScore(),
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`generateImprovements failed: ${String(err)}`],
      };
    }
  }

  createLearningSnapshot(
    label?: string,
    kind: LearningSnapshotKind = "learning"
  ): LearningSnapshot {
    const started = Date.now();
    try {
      const score = this.lastHealthScore ?? zeroScore();
      const improvements =
        this.lastResult?.improvements.improvements.length ?? 0;
      const backlog = this.lastResult?.improvements.backlog.length ?? 0;
      const payload = buildLearningSnapshotPayload({
        kind,
        score,
        patternCount: this.lastResult?.patterns.patterns.length ?? 0,
        feedbackCount: this.feedback.size,
        improvementCount: improvements,
        backlogSize: backlog,
        averageImpact: this.lastAverageImpact,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        learningHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildLearningSnapshotPayload({
          kind,
          score: zeroScore(),
          patternCount: 0,
          feedbackCount: 0,
          improvementCount: 0,
          backlogSize: 0,
          averageImpact: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareLearningSnapshots(
    baselineId: string,
    compareId: string
  ): LearningSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareLearningSnapshots(a, b);
  }

  listSnapshots(): LearningSnapshot[] {
    return this.snapshots.list();
  }

  listFeedback(): FeedbackRecord[] {
    return this.feedback.list();
  }

  getLearningMetrics(): LearningOperationalMetrics {
    this.metrics.setFeedbackCount(this.feedback.size);
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getLearningHealthScore(): LearningHealthScore {
    return this.lastHealthScore ?? zeroScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastResult(): LearningRunResult | null {
    return this.lastResult;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.feedback.clear();
    this.trendLearning.reset();
    this.regressionLearning.reset();
    this.improvementAnalyzer.clearHistory();
    this.planner.reset();
    this.lastHealthScore = null;
    this.lastResult = null;
    this.lastAverageImpact = 0;
    this.runSeq = 0;
  }

  private computeHealthScore(parts: {
    patternCoverage: number;
    feedbackCoverage: number;
    trendDetection: number;
    recommendationQuality: number;
    regressionLearning: number;
  }): LearningHealthScore {
    const w = this.config.scoreWeights;
    const auditCompleteness = this.audit.completenessScore();
    const overall = clamp(
      Math.round(
        parts.patternCoverage * w.patternCoverage +
          parts.feedbackCoverage * w.feedbackCoverage +
          parts.trendDetection * w.trendDetection +
          parts.recommendationQuality * w.recommendationQuality +
          parts.regressionLearning * w.regressionLearning +
          auditCompleteness * w.auditCompleteness
      ),
      0,
      100
    );
    const score: LearningHealthScore = {
      patternCoverage: parts.patternCoverage,
      feedbackCoverage: parts.feedbackCoverage,
      trendDetection: parts.trendDetection,
      recommendationQuality: parts.recommendationQuality,
      regressionLearning: parts.regressionLearning,
      auditCompleteness,
      overall,
    };
    this.metrics.setHealthScore(overall);
    return score;
  }
}

function zeroScore(): LearningHealthScore {
  return {
    patternCoverage: 0,
    feedbackCoverage: 0,
    trendDetection: 0,
    recommendationQuality: 0,
    regressionLearning: 0,
    auditCompleteness: 0,
    overall: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const BUILTIN_SOURCES: Array<{
  kind: LearningSourceKind;
  label: string;
  module: string;
  signals: LearningSignalKind[];
  baselineQuality: number;
  weight: number;
}> = [
  { kind: "orchestrator", label: "Validation Orchestrator", module: "orchestrator", signals: ["historical_validation", "operational_metric"], baselineQuality: 88, weight: 1.2 },
  { kind: "analytics", label: "Analytics Engine", module: "analytics", signals: ["historical_validation", "rule_performance", "failure_history"], baselineQuality: 84, weight: 1.1 },
  { kind: "simulation", label: "Simulation Engine", module: "simulation", signals: ["simulation_result", "regression_history"], baselineQuality: 82, weight: 1 },
  { kind: "performance", label: "Performance Engine", module: "performance", signals: ["performance_trend", "operational_metric"], baselineQuality: 80, weight: 0.9 },
  { kind: "trust", label: "Trust Engine", module: "trust", signals: ["trust_score", "historical_validation"], baselineQuality: 86, weight: 1 },
  { kind: "explainability", label: "Explainability Engine", module: "explainability", signals: ["feedback_record", "rule_performance"], baselineQuality: 81, weight: 0.9 },
  { kind: "knowledge", label: "Knowledge Graph", module: "knowledge", signals: ["historical_validation", "failure_history"], baselineQuality: 83, weight: 0.9 },
  { kind: "dashboard", label: "Validation Dashboard", module: "dashboard", signals: ["operational_metric", "feedback_record"], baselineQuality: 78, weight: 0.7 },
  { kind: "reporting", label: "Reporting Engine", module: "reporting", signals: ["historical_validation", "regression_history"], baselineQuality: 79, weight: 0.8 },
  { kind: "observability", label: "Observability Engine", module: "observability", signals: ["operational_metric", "performance_trend"], baselineQuality: 85, weight: 0.8 },
  { kind: "compliance", label: "Compliance Engine", module: "compliance", signals: ["feedback_record", "failure_history"], baselineQuality: 87, weight: 1.1 },
  { kind: "security", label: "Security Engine", module: "security", signals: ["operational_metric", "feedback_record"], baselineQuality: 86, weight: 1 },
  { kind: "events", label: "Validation Event Bus", module: "events", signals: ["operational_metric", "failure_history"], baselineQuality: 90, weight: 0.6 },
];

export function registerBuiltinLearningSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinLearningSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listLearningSources().length,
      total: listLearningSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const src of BUILTIN_SOURCES) {
    const result = registerLearningSource(
      {
        sourceId: createLearningSourceId(src.kind),
        kind: src.kind,
        label: src.label,
        module: src.module,
        signals: src.signals,
        baselineQuality: src.baselineQuality,
        weight: src.weight,
        metadata: { integration: "read-only-advisory", sprint: "9F.29" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinLearningSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listLearningSources().length,
  };
}

export interface LearningRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerLearning(options?: {
  engine?: ValidationLearningEngine;
  config?: LearningConfigurationInput;
  force?: boolean;
}): LearningRegistrationResult {
  return registerValidationLearningEngine(options);
}

export function registerValidationLearningEngine(options?: {
  engine?: ValidationLearningEngine;
  config?: LearningConfigurationInput;
  force?: boolean;
}): LearningRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listLearningSources().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationLearningEngine(options?.config);
  }

  const builtins = registerBuiltinLearningSources({ force: options?.force });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
  };
}

export function getValidationLearningEngine(
  options?: LearningConfigurationInput
): ValidationLearningEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationLearningEngine(options);
    registerBuiltinLearningSources();
  }
  return defaultEngine;
}

export function resetValidationLearningEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetLearningRegistry();
}

/** Public API convenience wrappers. */
export function collectFeedback(input: CollectFeedbackInput) {
  registerLearning();
  return getValidationLearningEngine().collectFeedback(input);
}

export function analyzePatterns(options?: AnalyzePatternsOptions) {
  registerLearning();
  return getValidationLearningEngine().analyzePatterns(options);
}

export function generateImprovements(options?: GenerateImprovementsOptions) {
  registerLearning();
  return getValidationLearningEngine().generateImprovements(options);
}

export function createLearningSnapshot(
  label?: string,
  kind?: LearningSnapshotKind
) {
  registerLearning();
  return getValidationLearningEngine().createLearningSnapshot(label, kind);
}

export function getLearningMetrics() {
  registerLearning();
  return getValidationLearningEngine().getLearningMetrics();
}

export {
  DEFAULT_LEARNING_CONFIGURATION,
  resolveLearningConfiguration,
};
