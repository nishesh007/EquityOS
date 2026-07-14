/**
 * Stress test engine — extreme inputs, concurrency, drift, dependency/resource pressure.
 */

import type { SimulationConfiguration } from "./SimulationConfiguration";
import type { SimulationSourceDefinition } from "./SimulationRegistry";
import { ScenarioBuilder, type ScenarioDefinition } from "./ScenarioBuilder";
import { ScenarioRunner, type ScenarioRunResult } from "./ScenarioRunner";
import { seededUnit } from "./seededRandom";

export type StressProfile =
  | "extreme_inputs"
  | "large_dataset"
  | "rule_explosion"
  | "high_concurrency"
  | "configuration_drift"
  | "dependency_failure"
  | "resource_pressure";

export interface StressTestOptions {
  profiles?: StressProfile[];
  concurrency?: number;
  datasetSize?: number;
}

export interface StressTestResult {
  stressId: string;
  profiles: StressProfile[];
  runs: ScenarioRunResult[];
  coverageScore: number;
  peakFailureRate: number;
  peakConcurrency: number;
  resourcePressurePct: number;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

const ALL_PROFILES: StressProfile[] = [
  "extreme_inputs",
  "large_dataset",
  "rule_explosion",
  "high_concurrency",
  "configuration_drift",
  "dependency_failure",
  "resource_pressure",
];

export class StressTestEngine {
  private config: SimulationConfiguration;
  private readonly builder = new ScenarioBuilder();
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
    options: StressTestOptions = {}
  ): StressTestResult {
    const started = Date.now();
    this.seq += 1;
    const stressId = `stress:${this.seq}:${Date.now()}`;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const profiles = options.profiles?.length
        ? options.profiles
        : ALL_PROFILES;
      const concurrency = Math.max(
        1,
        options.concurrency ?? Math.max(8, this.config.iterationCount / 10)
      );
      const datasetSize = Math.max(10, options.datasetSize ?? 500);
      const runs: ScenarioRunResult[] = [];

      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i]!;
        const scenario = this.buildStressScenario(profile, datasetSize, concurrency);
        const result = this.runner.run(scenario, sources, {
          seedOffset: i * 17 + Math.round(concurrency),
        });
        // Amplify advisory stress signals without touching production validation.
        const amplified = amplifyStress(result, profile, concurrency, datasetSize);
        runs.push(amplified);
        warnings.push(...amplified.warnings);
        errors.push(...amplified.errors);
      }

      const peakFailureRate = runs.reduce(
        (m, r) => Math.max(m, r.failureRate),
        0
      );
      const resourcePressurePct = clamp(
        round2(
          40 +
            concurrency * 3 +
            datasetSize / 50 +
            peakFailureRate * 20
        ),
        0,
        100
      );
      const coverageScore = clamp(
        Math.round((profiles.length / ALL_PROFILES.length) * 100),
        0,
        100
      );

      if (peakFailureRate >= 0.6) {
        warnings.push("Stress peak failure rate exceeds advisory threshold");
      }
      if (resourcePressurePct >= 85) {
        warnings.push("Resource pressure elevated under stress profiles");
      }

      return {
        stressId,
        profiles,
        runs,
        coverageScore,
        peakFailureRate: round2(peakFailureRate),
        peakConcurrency: concurrency,
        resourcePressurePct,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`stress test failed: ${String(err)}`);
      return {
        stressId,
        profiles: options.profiles ?? [],
        runs: [],
        coverageScore: 0,
        peakFailureRate: 1,
        peakConcurrency: 0,
        resourcePressurePct: 0,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
    }
  }

  private buildStressScenario(
    profile: StressProfile,
    datasetSize: number,
    concurrency: number
  ): ScenarioDefinition {
    switch (profile) {
      case "extreme_inputs":
        return this.builder.build({
          type: "market_crash",
          label: "Stress: Extreme Inputs",
          marketShock: -0.8,
          volatility: 1,
          expectedFailureRate: 0.7,
          parameters: { datasetSize },
        });
      case "large_dataset":
        return this.builder.build({
          type: "high_volatility",
          label: "Stress: Large Dataset",
          volatility: 0.7,
          expectedFailureRate: 0.35,
          parameters: { datasetSize },
        });
      case "rule_explosion":
        return this.builder.build({
          type: "rule_change",
          label: "Stress: Rule Explosion",
          ruleChangeIntensity: 1,
          expectedFailureRate: 0.5,
          parameters: { ruleCount: datasetSize },
        });
      case "high_concurrency":
        return this.builder.build({
          type: "bull_market",
          label: "Stress: High Concurrency",
          expectedFailureRate: 0.25,
          parameters: { concurrency },
        });
      case "configuration_drift":
        return this.builder.build({
          type: "configuration_change",
          label: "Stress: Configuration Drift",
          configurationDrift: 1,
          expectedFailureRate: 0.4,
        });
      case "dependency_failure":
        return this.builder.build({
          type: "corporate_action",
          label: "Stress: Dependency Failure",
          expectedFailureRate: 0.55,
          modules: ["orchestrator", "rules", "trust", "knowledge"],
        });
      case "resource_pressure":
      default:
        return this.builder.build({
          type: "low_liquidity",
          label: "Stress: Resource Pressure",
          liquidity: 0.05,
          volatility: 0.9,
          expectedFailureRate: 0.6,
          parameters: { concurrency, datasetSize },
        });
    }
  }
}

function amplifyStress(
  result: ScenarioRunResult,
  profile: StressProfile,
  concurrency: number,
  datasetSize: number
): ScenarioRunResult {
  const factor =
    profile === "extreme_inputs"
      ? 1.25
      : profile === "high_concurrency"
        ? 1 + concurrency / 100
        : profile === "large_dataset"
          ? 1 + datasetSize / 5000
          : 1.1;
  const noise = seededUnit(concurrency + datasetSize, profile.length) * 0.05;
  return {
    ...result,
    failureRate: clamp(round2(result.failureRate * factor + noise), 0, 1),
    validationScore: clamp(
      round2(result.validationScore / factor),
      0,
      100
    ),
    warnings: [
      ...result.warnings,
      `Applied sandbox stress profile: ${profile}`,
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
