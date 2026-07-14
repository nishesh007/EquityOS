/**
 * Monte Carlo engine — randomized sandbox iterations with confidence intervals.
 */

import type { SimulationConfiguration } from "./SimulationConfiguration";
import type { SimulationSourceDefinition } from "./SimulationRegistry";
import type { ScenarioDefinition } from "./ScenarioBuilder";
import { ScenarioRunner, type ScenarioRunResult } from "./ScenarioRunner";
import { seededUnit } from "./seededRandom";

export interface MonteCarloOptions {
  scenario: ScenarioDefinition;
  iterations?: number;
  seed?: number;
}

export interface MonteCarloOutcome {
  iteration: number;
  validationScore: number;
  confidenceScore: number;
  failureRate: number;
  trustScore: number;
}

export interface MonteCarloResult {
  monteCarloId: string;
  scenarioId: string;
  iterations: number;
  seed: number;
  outcomes: MonteCarloOutcome[];
  meanValidationScore: number;
  meanConfidenceScore: number;
  meanFailureRate: number;
  confidenceInterval95: { low: number; high: number };
  outcomeDistribution: {
    pass: number;
    warn: number;
    fail: number;
  };
  scenarioRankingScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  sampleRuns: ScenarioRunResult[];
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

export class MonteCarloEngine {
  private config: SimulationConfiguration;
  private readonly runner: ScenarioRunner;
  private seq = 0;

  constructor(config: SimulationConfiguration) {
    this.config = config;
    this.runner = new ScenarioRunner(config);
  }

  setConfiguration(config: SimulationConfiguration): void {
    this.config = config;
    this.runner.setConfiguration(config);
  }

  run(
    sources: SimulationSourceDefinition[],
    options: MonteCarloOptions
  ): MonteCarloResult {
    const started = Date.now();
    this.seq += 1;
    const monteCarloId = `mc:${this.seq}:${Date.now()}`;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const iterations = clamp(
        options.iterations ?? this.config.iterationCount,
        1,
        this.config.maxIterations
      );
      const seed = options.seed ?? this.config.randomSeed;
      const outcomes: MonteCarloOutcome[] = [];
      const sampleRuns: ScenarioRunResult[] = [];

      for (let i = 0; i < iterations; i++) {
        const perturbed = perturbScenario(options.scenario, seed, i);
        const run = this.runner.run(perturbed, sources, {
          seedOffset: seed + i * 31,
        });
        outcomes.push({
          iteration: i + 1,
          validationScore: run.validationScore,
          confidenceScore: run.confidenceScore,
          failureRate: run.failureRate,
          trustScore: run.trustScore,
        });
        if (i < 5) sampleRuns.push(run);
        warnings.push(...run.warnings);
        errors.push(...run.errors);
      }

      const scores = outcomes.map((o) => o.validationScore).sort((a, b) => a - b);
      const meanValidationScore = mean(scores);
      const meanConfidenceScore = mean(outcomes.map((o) => o.confidenceScore));
      const meanFailureRate = mean(outcomes.map((o) => o.failureRate));
      const confidenceInterval95 = {
        low: percentile(scores, 2.5),
        high: percentile(scores, 97.5),
      };

      const outcomeDistribution = {
        pass: outcomes.filter((o) => o.validationScore >= 70).length,
        warn: outcomes.filter(
          (o) => o.validationScore >= 50 && o.validationScore < 70
        ).length,
        fail: outcomes.filter((o) => o.validationScore < 50).length,
      };

      const riskDistribution = {
        low: outcomes.filter((o) => o.failureRate < 0.2).length,
        medium: outcomes.filter(
          (o) => o.failureRate >= 0.2 && o.failureRate < 0.45
        ).length,
        high: outcomes.filter((o) => o.failureRate >= 0.45).length,
      };

      const scenarioRankingScore = clamp(
        Math.round(
          meanValidationScore * 0.5 +
            meanConfidenceScore * 0.3 +
            (1 - meanFailureRate) * 100 * 0.2
        ),
        0,
        100
      );

      if (confidenceInterval95.high - confidenceInterval95.low > 40) {
        warnings.push("Wide confidence interval indicates high outcome variance");
      }

      return {
        monteCarloId,
        scenarioId: options.scenario.scenarioId,
        iterations,
        seed,
        outcomes,
        meanValidationScore: round2(meanValidationScore),
        meanConfidenceScore: round2(meanConfidenceScore),
        meanFailureRate: round2(meanFailureRate),
        confidenceInterval95: {
          low: round2(confidenceInterval95.low),
          high: round2(confidenceInterval95.high),
        },
        outcomeDistribution,
        scenarioRankingScore,
        riskDistribution,
        sampleRuns,
        executionTimeMs: Date.now() - started,
        warnings: [...new Set(warnings)],
        errors: [...new Set(errors)],
      };
    } catch (err) {
      errors.push(`monte carlo failed: ${String(err)}`);
      return {
        monteCarloId,
        scenarioId: options.scenario.scenarioId,
        iterations: 0,
        seed: options.seed ?? this.config.randomSeed,
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
        warnings,
        errors,
      };
    }
  }
}

function perturbScenario(
  scenario: ScenarioDefinition,
  seed: number,
  iteration: number
): ScenarioDefinition {
  const u = seededUnit(seed, iteration + 1);
  const v = seededUnit(seed, iteration + 99);
  return {
    ...scenario,
    scenarioId: `${scenario.scenarioId}:mc:${iteration + 1}`,
    marketShock: clamp(scenario.marketShock + (u - 0.5) * 0.2, -1, 1),
    volatility: clamp(scenario.volatility + (v - 0.5) * 0.15, 0, 1),
    liquidity: clamp(scenario.liquidity + (u - 0.5) * 0.1, 0, 1),
    expectedFailureRate: clamp(
      scenario.expectedFailureRate + (v - 0.5) * 0.1,
      0,
      1
    ),
    modules: [...scenario.modules],
    parameters: scenario.parameters ? { ...scenario.parameters } : undefined,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  const w = rank - low;
  return sorted[low]! * (1 - w) + sorted[high]! * w;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
