/**
 * Scenario runner — executes sandboxed scenario simulations (advisory only).
 */

import type { SimulationConfiguration } from "./SimulationConfiguration";
import type { SimulationSourceDefinition } from "./SimulationRegistry";
import type { ScenarioDefinition } from "./ScenarioBuilder";
import { ScenarioValidator } from "./ScenarioValidator";
import { seededUnit } from "./seededRandom";

export interface ScenarioRunResult {
  runId: string;
  scenarioId: string;
  scenarioType: string;
  sandboxed: true;
  validationScore: number;
  confidenceScore: number;
  trustScore: number;
  performanceScore: number;
  failureRate: number;
  ruleCoverage: number;
  accuracyScore: number;
  moduleResults: Array<{
    module: string;
    score: number;
    confidence: number;
    failed: boolean;
  }>;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

export class ScenarioRunner {
  private config: SimulationConfiguration;
  private readonly validator = new ScenarioValidator();
  private seq = 0;

  constructor(config: SimulationConfiguration) {
    this.config = config;
  }

  setConfiguration(config: SimulationConfiguration): void {
    this.config = config;
  }

  run(
    scenario: ScenarioDefinition,
    sources: SimulationSourceDefinition[],
    options?: { seedOffset?: number }
  ): ScenarioRunResult {
    const started = Date.now();
    this.seq += 1;
    const runId = `simrun:${this.seq}:${Date.now()}`;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const validation = this.validator.validate(scenario, {
        sandboxOnly: this.config.sandboxOnly,
        maxScenarios: this.config.maxScenarios,
      });
      warnings.push(...validation.warnings);
      if (!validation.valid) {
        errors.push(...validation.errors);
        return emptyResult(runId, scenario, errors, warnings, started);
      }

      const seed = this.config.randomSeed + (options?.seedOffset ?? 0);
      const relevant = sources.filter(
        (s) =>
          scenario.modules.length === 0 ||
          scenario.modules.includes(s.module) ||
          scenario.modules.includes(s.kind)
      );
      const pool = relevant.length > 0 ? relevant : sources;

      const shockPenalty = Math.abs(scenario.marketShock) * 40;
      const volPenalty = scenario.volatility * 25;
      const liqPenalty = (1 - scenario.liquidity) * 20;
      const driftPenalty = scenario.configurationDrift * 15;
      const rulePenalty = scenario.ruleChangeIntensity * 18;

      const moduleResults = pool.map((src, i) => {
        const noise = seededUnit(seed, i + 1) * 8 - 4;
        const score = clamp(
          round2(
            src.baselineScore -
              shockPenalty * src.weight * 0.15 -
              volPenalty * 0.1 -
              liqPenalty * 0.08 -
              driftPenalty * 0.1 -
              rulePenalty * 0.1 +
              noise
          ),
          0,
          100
        );
        const confidence = clamp(
          round2(
            src.baselineConfidence * 100 -
              volPenalty * 0.2 -
              shockPenalty * 0.1 +
              noise * 0.5
          ),
          0,
          100
        );
        const failed =
          score < 55 ||
          seededUnit(seed, i + 100) < scenario.expectedFailureRate * 0.5;
        return {
          module: src.module,
          score,
          confidence,
          failed,
        };
      });

      const failureRate =
        moduleResults.length === 0
          ? scenario.expectedFailureRate
          : round2(
              moduleResults.filter((m) => m.failed).length /
                moduleResults.length
            );

      const validationScore =
        moduleResults.length === 0
          ? 50
          : round2(
              moduleResults.reduce((s, m) => s + m.score, 0) /
                moduleResults.length
            );
      const confidenceScore =
        moduleResults.length === 0
          ? 50
          : round2(
              moduleResults.reduce((s, m) => s + m.confidence, 0) /
                moduleResults.length
            );

      const trustScore = clamp(
        round2(
          (pool.reduce((s, src) => s + src.baselineTrust * 100, 0) /
            Math.max(1, pool.length)) -
            shockPenalty * 0.2 -
            failureRate * 30
        ),
        0,
        100
      );

      const performanceScore = clamp(
        round2(
          88 -
            volPenalty * 0.3 -
            (1 - scenario.liquidity) * 20 -
            Math.max(0, scenario.modules.length - 3) * 2
        ),
        0,
        100
      );

      const ruleCoverage = clamp(
        round2(100 - scenario.ruleChangeIntensity * 35 - failureRate * 20),
        0,
        100
      );

      const accuracyScore = clamp(
        round2(
          100 -
            Math.abs(failureRate - scenario.expectedFailureRate) * 100 -
            Math.abs(scenario.marketShock) * 10
        ),
        0,
        100
      );

      if (failureRate >= 0.4) {
        warnings.push("Elevated sandbox failure rate under scenario stress");
      }

      // Replay speed is advisory metadata only (no wall-clock sleep).
      const replayFactor = Math.max(0.1, this.config.replaySpeed);

      return {
        runId,
        scenarioId: scenario.scenarioId,
        scenarioType: scenario.type,
        sandboxed: true,
        validationScore,
        confidenceScore,
        trustScore,
        performanceScore,
        failureRate,
        ruleCoverage,
        accuracyScore,
        moduleResults,
        executionTimeMs: Math.max(
          1,
          Math.round((Date.now() - started) / replayFactor)
        ),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`scenario run failed: ${String(err)}`);
      return emptyResult(runId, scenario, errors, warnings, started);
    }
  }
}

function emptyResult(
  runId: string,
  scenario: ScenarioDefinition,
  errors: string[],
  warnings: string[],
  started: number
): ScenarioRunResult {
  return {
    runId,
    scenarioId: scenario.scenarioId,
    scenarioType: scenario.type,
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
    warnings,
    errors,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
