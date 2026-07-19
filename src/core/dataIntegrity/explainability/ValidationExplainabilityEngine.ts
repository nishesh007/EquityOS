/**
 * Institutional Validation AI Explainability & Decision Trace Engine — façade (Prompt 9F.27).
 * Observational only: never influences validation outcomes or interrupts validation execution.
 */

import {
  DEFAULT_EXPLAINABILITY_CONFIGURATION,
  resolveExplainabilityConfiguration,
  type ExplainabilityConfiguration,
  type ExplainabilityConfigurationInput,
  type ExplanationStyle,
} from "./ExplainabilityConfiguration";
import {
  areBuiltinExplainabilitySourcesRegistered,
  createExplainabilitySourceId,
  listExplainabilitySources,
  markBuiltinExplainabilitySourcesRegistered,
  registerExplainabilitySource,
  resetExplainabilityRegistry,
  type ExplainabilitySourceDefinition,
  type ExplainabilitySourceKind,
} from "./ExplainabilityRegistry";
import {
  DecisionTraceEngine,
  type DecisionTrace,
  type DecisionTraceInput,
} from "./DecisionTraceEngine";
import {
  RuleContributionAnalyzer,
  type RuleContributionReport,
} from "./RuleContributionAnalyzer";
import {
  ConfidenceBreakdownEngine,
  type ConfidenceBreakdown,
} from "./ConfidenceBreakdownEngine";
import { ExecutionPathAnalyzer } from "./ExecutionPathAnalyzer";
import {
  ExplanationGenerator,
  type GeneratedExplanation,
} from "./ExplanationGenerator";
import {
  DecisionTreeBuilder,
  type DecisionTreeKind,
  type DecisionTreeModel,
} from "./DecisionTreeBuilder";
import {
  ExplainabilityMetricsTracker,
  type ExplainabilityHealthScore,
  type ExplainabilityOperationalMetrics,
} from "./ExplainabilityMetrics";
import { ExplainabilityAuditLogger } from "./ExplainabilityAuditLogger";
import {
  ExplainabilitySnapshotStore,
  buildExplainabilitySnapshotPayload,
  compareExplainabilitySnapshots,
  type ExplainabilitySnapshot,
  type ExplainabilitySnapshotComparison,
  type ExplainabilitySnapshotKind,
} from "./ExplainabilitySnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { ExplainabilityHealthScore };

export interface TraceDecisionOptions extends DecisionTraceInput {
  generateExplanation?: boolean;
  explanationStyle?: ExplanationStyle;
  treeKind?: DecisionTreeKind;
}

export interface TraceDecisionResult {
  trace: DecisionTrace;
  contributions: RuleContributionReport;
  confidence: ConfidenceBreakdown;
  explanation: GeneratedExplanation | null;
  tree: DecisionTreeModel;
  healthScore: ExplainabilityHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationExplainabilityEngine | null = null;
let engineRegistered = false;

export class ValidationExplainabilityEngine {
  private config: ExplainabilityConfiguration;
  private traceEngine: DecisionTraceEngine;
  private readonly contributionAnalyzer = new RuleContributionAnalyzer();
  private readonly confidenceEngine = new ConfidenceBreakdownEngine();
  private readonly pathAnalyzer = new ExecutionPathAnalyzer();
  private explanationGenerator: ExplanationGenerator;
  private readonly treeBuilder = new DecisionTreeBuilder();
  private readonly metrics = new ExplainabilityMetricsTracker();
  private audit: ExplainabilityAuditLogger;
  private snapshots: ExplainabilitySnapshotStore;
  private lastResult: TraceDecisionResult | null = null;
  private lastHealthScore: ExplainabilityHealthScore | null = null;
  private explanationCount = 0;
  private traceCount = 0;

  constructor(configInput?: ExplainabilityConfigurationInput) {
    this.config = resolveExplainabilityConfiguration(configInput);
    this.traceEngine = new DecisionTraceEngine(this.config);
    this.explanationGenerator = new ExplanationGenerator(this.config);
    this.audit = new ExplainabilityAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new ExplainabilitySnapshotStore(
      this.config.snapshotRetention
    );
  }

  getConfiguration(): ExplainabilityConfiguration {
    return resolveExplainabilityConfiguration(this.config);
  }

  updateConfiguration(input: ExplainabilityConfigurationInput): void {
    this.config = resolveExplainabilityConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.traceEngine.setConfiguration(this.config);
    this.explanationGenerator.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: Omit<ExplainabilitySourceDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerExplainabilitySource(definition, options);
  }

  traceDecision(options: TraceDecisionOptions = {}): TraceDecisionResult {
    const started = Date.now();
    try {
      const sources = listExplainabilitySources();
      const trace = this.traceEngine.trace(sources, options);
      const contributions = this.contributionAnalyzer.analyze(trace);
      const confidence = this.confidenceEngine.breakdown(trace, contributions);
      const path = this.pathAnalyzer.analyze(trace);

      let explanation: GeneratedExplanation | null = null;
      if (options.generateExplanation !== false) {
        explanation = this.explanationGenerator.generate({
          trace,
          contributions,
          confidence,
          style: options.explanationStyle,
        });
        this.explanationCount += 1;
        this.metrics.recordExplanation({
          runtimeMs: Date.now() - started,
        });
      }

      const tree = this.treeBuilder.build({
        trace,
        confidence,
        kind: options.treeKind ?? "decision_graph",
      });

      const healthScore = this.computeHealthScore({
        trace,
        contributions,
        confidence,
        pathVisibility: path.dependencyVisibilityScore,
        explanationQuality: explanation?.qualityScore ?? 70,
      });

      this.traceCount += 1;
      this.lastHealthScore = healthScore;
      this.metrics.recordTrace({
        ruleCoverage: contributions.coverageScore,
        confidenceCoverage: confidence.coverageScore,
        healthScore: healthScore.overall,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      const warnings = [
        ...trace.warnings,
        ...contributions.warnings,
        ...confidence.warnings,
        ...path.warnings,
        ...(explanation?.warnings ?? []),
      ];
      const errors = [
        ...trace.errors,
        ...contributions.errors,
        ...confidence.errors,
        ...path.errors,
        ...(explanation?.errors ?? []),
      ];

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DecisionTraced",
        traceId: trace.traceId,
        decisionId: trace.decisionId,
        explainabilityHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "RuleContributionAnalyzed",
        traceId: trace.traceId,
        decisionId: trace.decisionId,
        explainabilityHealthScore: contributions.coverageScore,
        executionTimeMs: 0,
        warnings: contributions.warnings,
        errors: contributions.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ConfidenceBreakdown",
        traceId: trace.traceId,
        decisionId: trace.decisionId,
        explainabilityHealthScore: confidence.coverageScore,
        executionTimeMs: 0,
        warnings: confidence.warnings,
        errors: confidence.errors,
        engineVersion: this.config.engineVersion,
      });
      if (explanation) {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "ExplanationGenerated",
          traceId: trace.traceId,
          decisionId: trace.decisionId,
          explainabilityHealthScore: explanation.qualityScore,
          executionTimeMs: Date.now() - started,
          warnings: explanation.warnings,
          errors: explanation.errors,
          engineVersion: this.config.engineVersion,
        });
      }
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ExplainabilityScoreComputed",
        traceId: trace.traceId,
        decisionId: trace.decisionId,
        explainabilityHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "explainability",
        source: "explainability-engine",
        severity: errors.length > 0 ? "WARNING" : "INFO",
        payload: {
          traceId: trace.traceId,
          decisionId: trace.decisionId,
          healthScore: healthScore.overall,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      const result: TraceDecisionResult = {
        trace,
        contributions,
        confidence,
        explanation,
        tree,
        healthScore,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
      this.lastResult = result;
      return result;
    } catch (err) {
      // Explainability failures must never interrupt validation execution.
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`traceDecision failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return emptyResult(String(err), Date.now() - started);
    }
  }

  generateExplanation(options: TraceDecisionOptions = {}): GeneratedExplanation {
    const result = this.traceDecision({
      ...options,
      generateExplanation: true,
    });
    if (result.explanation) return result.explanation;
    return {
      explanationId: `expl:empty:${Date.now()}`,
      decisionId: result.trace.decisionId,
      traceId: result.trace.traceId,
      style: options.explanationStyle ?? this.config.explanationStyle,
      humanReadable: "No explanation generated.",
      ruleSummary: "",
      validationSummary: "",
      riskSummary: "",
      confidenceSummary: "",
      decisionSummary: "",
      recommendationSummary: "",
      qualityScore: 0,
      generatedAt: new Date().toISOString(),
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  analyzeRuleContribution(
    options: TraceDecisionOptions = {}
  ): RuleContributionReport {
    return this.traceDecision({
      ...options,
      generateExplanation: false,
    }).contributions;
  }

  getConfidenceBreakdown(
    options: TraceDecisionOptions = {}
  ): ConfidenceBreakdown {
    return this.traceDecision({
      ...options,
      generateExplanation: false,
    }).confidence;
  }

  createExplainabilitySnapshot(
    label?: string,
    kind: ExplainabilitySnapshotKind = "decision"
  ): ExplainabilitySnapshot {
    const started = Date.now();
    try {
      const result = this.lastResult;
      const score = this.lastHealthScore ?? zeroScore();
      const metrics = this.metrics.getMetrics();
      const payload = buildExplainabilitySnapshotPayload({
        kind,
        score,
        traceCount: this.traceCount,
        explanationCount: this.explanationCount,
        ruleCoverage: metrics.ruleCoverage,
        confidenceCoverage: metrics.confidenceCoverage,
        overallConfidence: result?.confidence.overallConfidence ?? 0,
        dependencyCount: result?.trace.dependencies.length ?? 0,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        explainabilityHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildExplainabilitySnapshotPayload({
          kind,
          score: zeroScore(),
          traceCount: 0,
          explanationCount: 0,
          ruleCoverage: 0,
          confidenceCoverage: 0,
          overallConfidence: 0,
          dependencyCount: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareExplainabilitySnapshots(
    baselineId: string,
    compareId: string
  ): ExplainabilitySnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareExplainabilitySnapshots(a, b);
  }

  listSnapshots(): ExplainabilitySnapshot[] {
    return this.snapshots.list();
  }

  getExplainabilityMetrics(): ExplainabilityOperationalMetrics {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getExplainabilityHealthScore(): ExplainabilityHealthScore {
    return this.lastHealthScore ?? zeroScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastResult(): TraceDecisionResult | null {
    return this.lastResult;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.confidenceEngine.resetHistory();
    this.lastResult = null;
    this.lastHealthScore = null;
    this.explanationCount = 0;
    this.traceCount = 0;
  }

  private computeHealthScore(input: {
    trace: DecisionTrace;
    contributions: RuleContributionReport;
    confidence: ConfidenceBreakdown;
    pathVisibility: number;
    explanationQuality: number;
  }): ExplainabilityHealthScore {
    const w = this.config.scoreWeights;
    const traceCompleteness = input.trace.completenessScore;
    const ruleCoverage = input.contributions.coverageScore;
    const confidenceCoverage = input.confidence.coverageScore;
    const explanationQuality = input.explanationQuality;
    const dependencyVisibility = input.pathVisibility;
    const auditCompleteness = this.audit.completenessScore();

    const overall = clamp(
      Math.round(
        traceCompleteness * w.traceCompleteness +
          ruleCoverage * w.ruleCoverage +
          confidenceCoverage * w.confidenceCoverage +
          explanationQuality * w.explanationQuality +
          dependencyVisibility * w.dependencyVisibility +
          auditCompleteness * w.auditCompleteness
      ),
      0,
      100
    );

    const score: ExplainabilityHealthScore = {
      traceCompleteness,
      ruleCoverage,
      confidenceCoverage,
      explanationQuality,
      dependencyVisibility,
      auditCompleteness,
      overall,
    };
    this.metrics.setHealthScore(overall);
    return score;
  }
}

function emptyResult(error: string, executionTimeMs: number): TraceDecisionResult {
  const trace: DecisionTrace = {
    traceId: `trace:error:${Date.now()}`,
    decisionId: `decision:error`,
    validationType: "unknown",
    outcome: "unknown",
    overallConfidence: 0,
    flow: [],
    executionOrder: [],
    executedRules: [],
    skippedRules: [],
    failedRules: [],
    criticalRules: [],
    dependencies: [],
    timeline: [],
    completenessScore: 0,
    generatedAt: new Date().toISOString(),
    warnings: [],
    errors: [error],
  };
  return {
    trace,
    contributions: {
      decisionId: trace.decisionId,
      traceId: trace.traceId,
      contributions: [],
      totalWeight: 0,
      coverageScore: 0,
      warnings: [],
      errors: [error],
    },
    confidence: {
      decisionId: trace.decisionId,
      traceId: trace.traceId,
      overallConfidence: 0,
      perEngine: [],
      perRule: [],
      perModule: [],
      distribution: { high: 0, medium: 0, low: 0 },
      trend: "unknown",
      coverageScore: 0,
      warnings: [],
      errors: [error],
    },
    explanation: null,
    tree: { kind: "decision_graph", rootId: "root", nodes: [], edges: [] },
    healthScore: zeroScore(),
    executionTimeMs,
    warnings: [],
    errors: [error],
  };
}

function zeroScore(): ExplainabilityHealthScore {
  return {
    traceCompleteness: 0,
    ruleCoverage: 0,
    confidenceCoverage: 0,
    explanationQuality: 0,
    dependencyVisibility: 0,
    auditCompleteness: 0,
    overall: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const BUILTIN_SOURCES: Array<{
  kind: ExplainabilitySourceKind;
  label: string;
  module: string;
  defaultConfidence: number;
  weight: number;
}> = [
  { kind: "orchestrator", label: "Validation Orchestrator", module: "orchestrator", defaultConfidence: 0.9, weight: 1.2 },
  { kind: "rule_engine", label: "Rule Engine", module: "rules", defaultConfidence: 0.88, weight: 1.3 },
  { kind: "integrity", label: "Integrity Engine", module: "integrity", defaultConfidence: 0.86, weight: 1.1 },
  { kind: "trade", label: "Trade Validation", module: "tradeSetup", defaultConfidence: 0.84, weight: 1 },
  { kind: "hallucination", label: "Hallucination Engine", module: "hallucination", defaultConfidence: 0.82, weight: 1 },
  { kind: "trust", label: "Trust Engine", module: "trust", defaultConfidence: 0.85, weight: 1 },
  { kind: "analytics", label: "Analytics Engine", module: "analytics", defaultConfidence: 0.8, weight: 0.9 },
  { kind: "knowledge", label: "Knowledge Graph", module: "knowledge", defaultConfidence: 0.83, weight: 0.9 },
  { kind: "dashboard", label: "Validation Dashboard", module: "dashboard", defaultConfidence: 0.78, weight: 0.7 },
  { kind: "reporting", label: "Reporting Engine", module: "reporting", defaultConfidence: 0.8, weight: 0.8 },
  { kind: "observability", label: "Observability Engine", module: "observability", defaultConfidence: 0.81, weight: 0.7 },
  { kind: "events", label: "Validation Event Bus", module: "events", defaultConfidence: 0.9, weight: 0.6 },
];

export function registerBuiltinExplainabilitySources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinExplainabilitySourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listExplainabilitySources().length,
      total: listExplainabilitySources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const src of BUILTIN_SOURCES) {
    const result = registerExplainabilitySource(
      {
        sourceId: createExplainabilitySourceId(src.kind),
        kind: src.kind,
        label: src.label,
        module: src.module,
        defaultConfidence: src.defaultConfidence,
        weight: src.weight,
        metadata: { integration: "read-only", sprint: "9F.27" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinExplainabilitySourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listExplainabilitySources().length,
  };
}

export interface ExplainabilityRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerExplainability(options?: {
  engine?: ValidationExplainabilityEngine;
  config?: ExplainabilityConfigurationInput;
  force?: boolean;
}): ExplainabilityRegistrationResult {
  return registerValidationExplainabilityEngine(options);
}

export function registerValidationExplainabilityEngine(options?: {
  engine?: ValidationExplainabilityEngine;
  config?: ExplainabilityConfigurationInput;
  force?: boolean;
}): ExplainabilityRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listExplainabilitySources().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationExplainabilityEngine(options?.config);
  }

  const builtins = registerBuiltinExplainabilitySources({
    force: options?.force,
  });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
  };
}

export function getValidationExplainabilityEngine(
  options?: ExplainabilityConfigurationInput
): ValidationExplainabilityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationExplainabilityEngine(options);
    registerBuiltinExplainabilitySources();
  }
  return defaultEngine;
}

export function resetValidationExplainabilityEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetExplainabilityRegistry();
}

/** Public API convenience wrappers. */
export function traceDecision(options?: TraceDecisionOptions) {
  registerExplainability();
  return getValidationExplainabilityEngine().traceDecision(options);
}

export function generateExplanation(options?: TraceDecisionOptions) {
  registerExplainability();
  return getValidationExplainabilityEngine().generateExplanation(options);
}

export function analyzeRuleContribution(options?: TraceDecisionOptions) {
  registerExplainability();
  return getValidationExplainabilityEngine().analyzeRuleContribution(options);
}

export function getConfidenceBreakdown(options?: TraceDecisionOptions) {
  registerExplainability();
  return getValidationExplainabilityEngine().getConfidenceBreakdown(options);
}

export function createExplainabilitySnapshot(
  label?: string,
  kind?: ExplainabilitySnapshotKind
) {
  registerExplainability();
  return getValidationExplainabilityEngine().createExplainabilitySnapshot(
    label,
    kind
  );
}

export function getExplainabilityMetrics() {
  registerExplainability();
  return getValidationExplainabilityEngine().getExplainabilityMetrics();
}

export {
  DEFAULT_EXPLAINABILITY_CONFIGURATION,
  resolveExplainabilityConfiguration,
};
