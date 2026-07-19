/**
 * Institutional Validation Simulation & Scenario Testing Engine — façade (Prompt 9F.28).
 * Sandboxed only: never influences production validation decisions or execution.
 */

import {
  DEFAULT_SIMULATION_CONFIGURATION,
  resolveSimulationConfiguration,
  type SimulationConfiguration,
  type SimulationConfigurationInput,
  type SimulationMode,
} from "./SimulationConfiguration";
import {
  areBuiltinSimulationSourcesRegistered,
  createSimulationSourceId,
  listSimulationSources,
  markBuiltinSimulationSourcesRegistered,
  registerSimulationSource,
  resetSimulationRegistry,
  type SimulationSourceDefinition,
  type SimulationSourceKind,
} from "./SimulationRegistry";
import {
  ScenarioBuilder,
  type BuildScenarioInput,
  type ScenarioDefinition,
  type ScenarioType,
} from "./ScenarioBuilder";
import { ScenarioGenerator } from "./ScenarioGenerator";
import { ScenarioRunner, type ScenarioRunResult } from "./ScenarioRunner";
import { ScenarioComparator, type ScenarioComparison } from "./ScenarioComparator";
import { ScenarioValidator } from "./ScenarioValidator";
import {
  StressTestEngine,
  type StressTestOptions,
  type StressTestResult,
} from "./StressTestEngine";
import {
  MonteCarloEngine,
  type MonteCarloOptions,
  type MonteCarloResult,
} from "./MonteCarloEngine";
import {
  SimulationMetricsTracker,
  type SimulationHealthScore,
  type SimulationOperationalMetrics,
} from "./SimulationMetrics";
import { SimulationAuditLogger } from "./SimulationAuditLogger";
import {
  SimulationSnapshotStore,
  buildSimulationSnapshotPayload,
  compareSimulationSnapshots,
  type SimulationSnapshot,
  type SimulationSnapshotComparison,
  type SimulationSnapshotKind,
} from "./SimulationSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { SimulationHealthScore };

export interface RunScenarioOptions {
  scenario?: ScenarioDefinition;
  type?: ScenarioType;
  input?: BuildScenarioInput;
  mode?: SimulationMode;
  seedOffset?: number;
}

let defaultEngine: ValidationSimulationEngine | null = null;
let engineRegistered = false;

export class ValidationSimulationEngine {
  private config: SimulationConfiguration;
  private readonly builder = new ScenarioBuilder();
  private readonly generator = new ScenarioGenerator();
  private readonly validator = new ScenarioValidator();
  private runner: ScenarioRunner;
  private readonly comparator = new ScenarioComparator();
  private stressEngine: StressTestEngine;
  private monteCarloEngine: MonteCarloEngine;
  private readonly metrics = new SimulationMetricsTracker();
  private audit: SimulationAuditLogger;
  private snapshots: SimulationSnapshotStore;
  private lastHealthScore: SimulationHealthScore | null = null;
  private lastValidationScore = 0;
  private lastFailureRate = 0;
  private lastComparisonQuality = 80;
  private lastReplayIntegrity = 90;
  private lastStressCoverage = 0;
  private lastAccuracy = 80;
  private coveredScenarioTypes = new Set<string>();

  constructor(configInput?: SimulationConfigurationInput) {
    this.config = resolveSimulationConfiguration(configInput);
    this.runner = new ScenarioRunner(this.config);
    this.stressEngine = new StressTestEngine(this.config);
    this.monteCarloEngine = new MonteCarloEngine(this.config);
    this.audit = new SimulationAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new SimulationSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): SimulationConfiguration {
    return resolveSimulationConfiguration(this.config);
  }

  updateConfiguration(input: SimulationConfigurationInput): void {
    this.config = resolveSimulationConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.runner.setConfiguration(this.config);
    this.stressEngine.setConfiguration(this.config);
    this.monteCarloEngine.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: Omit<SimulationSourceDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerSimulationSource(definition, options);
  }

  buildScenario(input: BuildScenarioInput): ScenarioDefinition {
    return this.builder.build(input);
  }

  runScenario(options: RunScenarioOptions = {}): ScenarioRunResult {
    const started = Date.now();
    try {
      const scenario =
        options.scenario ??
        (options.input
          ? this.builder.build(options.input)
          : this.builder.buildPreset(options.type ?? "custom"));

      const validation = this.validator.validate(scenario, {
        sandboxOnly: this.config.sandboxOnly,
      });
      if (!validation.valid && this.config.mode === "strict") {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "Error",
          scenarioId: scenario.scenarioId,
          executionTimeMs: Date.now() - started,
          warnings: validation.warnings,
          errors: validation.errors,
          engineVersion: this.config.engineVersion,
        });
      }

      const result = this.runner.run(scenario, listSimulationSources(), {
        seedOffset: options.seedOffset,
      });

      this.coveredScenarioTypes.add(scenario.type);
      this.lastValidationScore = result.validationScore;
      this.lastFailureRate = result.failureRate;
      this.lastAccuracy = result.accuracyScore;
      if (
        options.mode === "historical_replay" ||
        this.config.simulationMode === "historical_replay"
      ) {
        this.lastReplayIntegrity = clamp(
          Math.round(100 - Math.abs(result.failureRate - scenario.expectedFailureRate) * 80),
          0,
          100
        );
        this.metrics.recordReplay(Date.now() - started);
      }

      const healthScore = this.computeHealthScore();
      this.lastHealthScore = healthScore;
      this.metrics.recordScenario(Date.now() - started, healthScore.overall);
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ScenarioRun",
        scenarioId: scenario.scenarioId,
        runId: result.runId,
        simulationHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SimulationScoreComputed",
        scenarioId: scenario.scenarioId,
        runId: result.runId,
        simulationHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      if (
        options.mode === "historical_replay" ||
        this.config.simulationMode === "historical_replay"
      ) {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "ReplayRun",
          scenarioId: scenario.scenarioId,
          runId: result.runId,
          simulationHealthScore: this.lastReplayIntegrity,
          executionTimeMs: Date.now() - started,
          warnings: [],
          errors: [],
          engineVersion: this.config.engineVersion,
        });
      }

      safePublishEvent({
        eventType: "WarningRaised",
        module: "simulation",
        source: "simulation-engine",
        severity: result.errors.length > 0 ? "WARNING" : "INFO",
        payload: {
          scenarioId: scenario.scenarioId,
          runId: result.runId,
          sandboxed: true,
          noValidationMutation: true,
          healthScore: healthScore.overall,
        },
        executionTimeMs: Date.now() - started,
      });

      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runScenario failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        runId: `simrun:error:${Date.now()}`,
        scenarioId: "error",
        scenarioType: "custom",
        sandboxed: true,
        validationScore: 0,
        confidenceScore: 0,
        trustScore: 0,
        performanceScore: 0,
        failureRate: 1,
        ruleCoverage: 0,
        accuracyScore: 0,
        moduleResults: [],
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runScenario failed: ${String(err)}`],
      };
    }
  }

  runStressTest(options: StressTestOptions = {}): StressTestResult {
    const started = Date.now();
    try {
      const result = this.stressEngine.run(listSimulationSources(), options);
      this.lastStressCoverage = result.coverageScore;
      this.lastFailureRate = result.peakFailureRate;
      const healthScore = this.computeHealthScore();
      this.lastHealthScore = healthScore;
      this.metrics.recordStress(Date.now() - started);
      this.metrics.setHealthScore(healthScore.overall);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "StressTest",
        runId: result.stressId,
        simulationHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });

      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runStressTest failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        stressId: `stress:error:${Date.now()}`,
        profiles: [],
        runs: [],
        coverageScore: 0,
        peakFailureRate: 1,
        peakConcurrency: 0,
        resourcePressurePct: 0,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runStressTest failed: ${String(err)}`],
      };
    }
  }

  runMonteCarlo(
    options: Omit<MonteCarloOptions, "scenario"> & {
      scenario?: ScenarioDefinition;
      type?: ScenarioType;
    }
  ): MonteCarloResult {
    const started = Date.now();
    try {
      const scenario =
        options.scenario ??
        this.builder.buildPreset(options.type ?? "high_volatility");
      const result = this.monteCarloEngine.run(listSimulationSources(), {
        scenario,
        iterations: options.iterations,
        seed: options.seed,
      });
      this.coveredScenarioTypes.add(scenario.type);
      this.lastAccuracy = clamp(
        Math.round(
          100 -
            (result.confidenceInterval95.high -
              result.confidenceInterval95.low) *
              0.5
        ),
        0,
        100
      );
      this.lastFailureRate = result.meanFailureRate;
      this.lastValidationScore = result.meanValidationScore;
      const healthScore = this.computeHealthScore();
      this.lastHealthScore = healthScore;
      this.metrics.recordMonteCarlo(Date.now() - started);
      this.metrics.setHealthScore(healthScore.overall);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "MonteCarloRun",
        scenarioId: scenario.scenarioId,
        runId: result.monteCarloId,
        simulationHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });

      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runMonteCarlo failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        monteCarloId: `mc:error:${Date.now()}`,
        scenarioId: "error",
        iterations: 0,
        seed: this.config.randomSeed,
        outcomes: [],
        meanValidationScore: 0,
        meanConfidenceScore: 0,
        meanFailureRate: 1,
        confidenceInterval95: { low: 0, high: 0 },
        outcomeDistribution: { pass: 0, warn: 0, fail: 0 },
        scenarioRankingScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        sampleRuns: [],
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runMonteCarlo failed: ${String(err)}`],
      };
    }
  }

  compareScenarios(
    left: ScenarioRunResult | RunScenarioOptions,
    right: ScenarioRunResult | RunScenarioOptions
  ): ScenarioComparison {
    const leftResult =
      "runId" in left && "validationScore" in left
        ? left
        : this.runScenario(left);
    const rightResult =
      "runId" in right && "validationScore" in right
        ? right
        : this.runScenario(right);
    const comparison = this.comparator.compare(leftResult, rightResult);
    this.lastComparisonQuality = comparison.qualityScore;
    const healthScore = this.computeHealthScore();
    this.lastHealthScore = healthScore;

    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "ScenarioCompared",
      scenarioId: `${comparison.leftScenarioId}|${comparison.rightScenarioId}`,
      runId: `${comparison.leftRunId}|${comparison.rightRunId}`,
      simulationHealthScore: healthScore.overall,
      scoreBreakdown: healthScore,
      executionTimeMs: 0,
      warnings: comparison.warnings,
      errors: comparison.errors,
      engineVersion: this.config.engineVersion,
    });

    return comparison;
  }

  createSimulationSnapshot(
    label?: string,
    kind: SimulationSnapshotKind = "simulation"
  ): SimulationSnapshot {
    const started = Date.now();
    try {
      const score = this.lastHealthScore ?? this.computeHealthScore();
      const metrics = this.metrics.getMetrics();
      const payload = buildSimulationSnapshotPayload({
        kind,
        score,
        scenarioCount: metrics.scenarioRuns,
        stressCount: metrics.stressTests,
        monteCarloCount: metrics.monteCarloRuns,
        failureRate: this.lastFailureRate,
        averageValidationScore: this.lastValidationScore,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        simulationHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildSimulationSnapshotPayload({
          kind,
          score: zeroScore(),
          scenarioCount: 0,
          stressCount: 0,
          monteCarloCount: 0,
          failureRate: 0,
          averageValidationScore: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareSimulationSnapshots(
    baselineId: string,
    compareId: string
  ): SimulationSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareSimulationSnapshots(a, b);
  }

  listSnapshots(): SimulationSnapshot[] {
    return this.snapshots.list();
  }

  generateScenarios(mode?: SimulationMode): ScenarioDefinition[] {
    return this.generator.generate({
      mode: mode ?? this.config.simulationMode,
    });
  }

  getSimulationMetrics(): SimulationOperationalMetrics {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getSimulationHealthScore(): SimulationHealthScore {
    return this.lastHealthScore ?? this.computeHealthScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastHealthScore = null;
    this.lastValidationScore = 0;
    this.lastFailureRate = 0;
    this.lastComparisonQuality = 80;
    this.lastReplayIntegrity = 90;
    this.lastStressCoverage = 0;
    this.lastAccuracy = 80;
    this.coveredScenarioTypes.clear();
  }

  private computeHealthScore(): SimulationHealthScore {
    const w = this.config.scoreWeights;
    const presetCount = 9;
    const scenarioCoverage = clamp(
      Math.round((this.coveredScenarioTypes.size / presetCount) * 100),
      0,
      100
    );
    const simulationAccuracy = this.lastAccuracy;
    const stressCoverage = this.lastStressCoverage;
    const comparisonQuality = this.lastComparisonQuality;
    const replayIntegrity = this.lastReplayIntegrity;
    const auditCompleteness = this.audit.completenessScore();

    const overall = clamp(
      Math.round(
        scenarioCoverage * w.scenarioCoverage +
          simulationAccuracy * w.simulationAccuracy +
          stressCoverage * w.stressCoverage +
          comparisonQuality * w.comparisonQuality +
          replayIntegrity * w.replayIntegrity +
          auditCompleteness * w.auditCompleteness
      ),
      0,
      100
    );

    const score: SimulationHealthScore = {
      scenarioCoverage,
      simulationAccuracy,
      stressCoverage,
      comparisonQuality,
      replayIntegrity,
      auditCompleteness,
      overall,
    };
    this.metrics.setHealthScore(overall);
    return score;
  }
}

function zeroScore(): SimulationHealthScore {
  return {
    scenarioCoverage: 0,
    simulationAccuracy: 0,
    stressCoverage: 0,
    comparisonQuality: 0,
    replayIntegrity: 0,
    auditCompleteness: 0,
    overall: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const BUILTIN_SOURCES: Array<{
  kind: SimulationSourceKind;
  label: string;
  module: string;
  baselineScore: number;
  baselineConfidence: number;
  baselineTrust: number;
  weight: number;
}> = [
  { kind: "orchestrator", label: "Validation Orchestrator", module: "orchestrator", baselineScore: 88, baselineConfidence: 0.9, baselineTrust: 0.88, weight: 1.2 },
  { kind: "rule_engine", label: "Rule Engine", module: "rules", baselineScore: 86, baselineConfidence: 0.88, baselineTrust: 0.86, weight: 1.3 },
  { kind: "integrity", label: "Integrity Engine", module: "integrity", baselineScore: 85, baselineConfidence: 0.86, baselineTrust: 0.85, weight: 1.1 },
  { kind: "trade", label: "Trade Validation", module: "tradeSetup", baselineScore: 84, baselineConfidence: 0.84, baselineTrust: 0.83, weight: 1 },
  { kind: "trust", label: "Trust Engine", module: "trust", baselineScore: 87, baselineConfidence: 0.87, baselineTrust: 0.9, weight: 1 },
  { kind: "analytics", label: "Analytics Engine", module: "analytics", baselineScore: 82, baselineConfidence: 0.82, baselineTrust: 0.8, weight: 0.9 },
  { kind: "knowledge", label: "Knowledge Graph", module: "knowledge", baselineScore: 83, baselineConfidence: 0.83, baselineTrust: 0.82, weight: 0.9 },
  { kind: "performance", label: "Performance Engine", module: "performance", baselineScore: 80, baselineConfidence: 0.8, baselineTrust: 0.78, weight: 0.8 },
  { kind: "reliability", label: "Reliability Engine", module: "reliability", baselineScore: 84, baselineConfidence: 0.84, baselineTrust: 0.85, weight: 0.9 },
  { kind: "explainability", label: "Explainability Engine", module: "explainability", baselineScore: 81, baselineConfidence: 0.81, baselineTrust: 0.8, weight: 0.8 },
  { kind: "dashboard", label: "Validation Dashboard", module: "dashboard", baselineScore: 78, baselineConfidence: 0.78, baselineTrust: 0.76, weight: 0.7 },
  { kind: "reporting", label: "Reporting Engine", module: "reporting", baselineScore: 79, baselineConfidence: 0.8, baselineTrust: 0.78, weight: 0.8 },
  { kind: "events", label: "Validation Event Bus", module: "events", baselineScore: 90, baselineConfidence: 0.9, baselineTrust: 0.88, weight: 0.6 },
];

export function registerBuiltinSimulationSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinSimulationSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listSimulationSources().length,
      total: listSimulationSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const src of BUILTIN_SOURCES) {
    const result = registerSimulationSource(
      {
        sourceId: createSimulationSourceId(src.kind),
        kind: src.kind,
        label: src.label,
        module: src.module,
        baselineScore: src.baselineScore,
        baselineConfidence: src.baselineConfidence,
        baselineTrust: src.baselineTrust,
        weight: src.weight,
        metadata: { integration: "read-only-sandbox", sprint: "9F.28" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinSimulationSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listSimulationSources().length,
  };
}

export interface SimulationRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerSimulation(options?: {
  engine?: ValidationSimulationEngine;
  config?: SimulationConfigurationInput;
  force?: boolean;
}): SimulationRegistrationResult {
  return registerValidationSimulationEngine(options);
}

export function registerValidationSimulationEngine(options?: {
  engine?: ValidationSimulationEngine;
  config?: SimulationConfigurationInput;
  force?: boolean;
}): SimulationRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listSimulationSources().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationSimulationEngine(options?.config);
  }

  const builtins = registerBuiltinSimulationSources({ force: options?.force });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
  };
}

export function getValidationSimulationEngine(
  options?: SimulationConfigurationInput
): ValidationSimulationEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationSimulationEngine(options);
    registerBuiltinSimulationSources();
  }
  return defaultEngine;
}

export function resetValidationSimulationEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetSimulationRegistry();
}

/** Public API convenience wrappers. */
export function runScenario(options?: RunScenarioOptions) {
  registerSimulation();
  return getValidationSimulationEngine().runScenario(options);
}

export function runStressTest(options?: StressTestOptions) {
  registerSimulation();
  return getValidationSimulationEngine().runStressTest(options);
}

export function runMonteCarlo(
  options: Parameters<ValidationSimulationEngine["runMonteCarlo"]>[0]
) {
  registerSimulation();
  return getValidationSimulationEngine().runMonteCarlo(options);
}

export function compareScenarios(
  left: Parameters<ValidationSimulationEngine["compareScenarios"]>[0],
  right: Parameters<ValidationSimulationEngine["compareScenarios"]>[1]
) {
  registerSimulation();
  return getValidationSimulationEngine().compareScenarios(left, right);
}

export function createSimulationSnapshot(
  label?: string,
  kind?: SimulationSnapshotKind
) {
  registerSimulation();
  return getValidationSimulationEngine().createSimulationSnapshot(label, kind);
}

export function getSimulationMetrics() {
  registerSimulation();
  return getValidationSimulationEngine().getSimulationMetrics();
}

export {
  DEFAULT_SIMULATION_CONFIGURATION,
  resolveSimulationConfiguration,
};
