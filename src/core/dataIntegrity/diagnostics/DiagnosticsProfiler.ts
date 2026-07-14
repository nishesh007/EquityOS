/**
 * Performance profiler for diagnostics (read-only observation).
 */

import type { DiagnosticsConfiguration } from "./DiagnosticsConfiguration";
import type { DiagnosticsProbe } from "./DiagnosticsRegistry";
import type { RuleInspectionRow } from "./DiagnosticsRuleInspector";
import type { PipelineInspectionRow } from "./DiagnosticsPipelineInspector";

export interface ProfileSample {
  label: string;
  kind: "rule" | "pipeline" | "engine" | "custom";
  executionTimeMs: number;
  cpuTimeMs: number;
  memoryUsageBytes: number;
  allocationCount: number;
  cacheHitRate: number | null;
}

export interface ProfileResult {
  profileId: string;
  executionTimeMs: number;
  cpuTimeMs: number;
  memoryUsageBytes: number;
  allocationCount: number;
  cachePerformance: {
    averageHitRate: number | null;
    sampleCount: number;
  };
  slowestRules: ProfileSample[];
  slowestPipelines: ProfileSample[];
  slowestEngines: ProfileSample[];
  samples: ProfileSample[];
  warnings: string[];
  errors: string[];
  profilerEnabled: boolean;
}

export class DiagnosticsProfiler {
  constructor(private config: DiagnosticsConfiguration) {}

  setConfiguration(config: DiagnosticsConfiguration): void {
    this.config = config;
  }

  profile(input: {
    probes?: DiagnosticsProbe[];
    rules?: RuleInspectionRow[];
    pipelines?: PipelineInspectionRow[];
    samples?: ProfileSample[];
  }): ProfileResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const samples: ProfileSample[] = [];

    if (!this.config.profilerEnabled) {
      return {
        profileId: createProfileId(),
        executionTimeMs: 0,
        cpuTimeMs: 0,
        memoryUsageBytes: 0,
        allocationCount: 0,
        cachePerformance: { averageHitRate: null, sampleCount: 0 },
        slowestRules: [],
        slowestPipelines: [],
        slowestEngines: [],
        samples: [],
        warnings: ["Profiler disabled by configuration."],
        errors: [],
        profilerEnabled: false,
      };
    }

    try {
      for (const probe of input.probes ?? []) {
        samples.push({
          label: probe.module,
          kind: "engine",
          executionTimeMs: probe.averageRuntimeMs ?? 0,
          cpuTimeMs: probe.averageRuntimeMs ?? 0,
          memoryUsageBytes: probe.memoryUsageBytes ?? 0,
          allocationCount: probe.validationCount ?? 0,
          cacheHitRate: probe.cacheHitRate ?? null,
        });
      }
      for (const rule of input.rules ?? []) {
        samples.push({
          label: rule.ruleId,
          kind: "rule",
          executionTimeMs: rule.executionTimeMs,
          cpuTimeMs: rule.executionTimeMs,
          memoryUsageBytes: 0,
          allocationCount: 0,
          cacheHitRate: null,
        });
      }
      for (const pipeline of input.pipelines ?? []) {
        samples.push({
          label: pipeline.pipelineId,
          kind: "pipeline",
          executionTimeMs: pipeline.averageRuntimeMs,
          cpuTimeMs: pipeline.averageRuntimeMs,
          memoryUsageBytes: 0,
          allocationCount: pipeline.executedRules.length,
          cacheHitRate: null,
        });
      }
      for (const sample of input.samples ?? []) {
        samples.push({ ...sample });
      }

      if (samples.length > this.config.maxProfileSamples) {
        samples.splice(0, samples.length - this.config.maxProfileSamples);
      }
    } catch (err) {
      errors.push(`Profiling failed: ${String(err)}`);
    }

    const slowestRules = topSlow(
      samples.filter((s) => s.kind === "rule"),
      this.config.slowRuleThresholdMs
    );
    const slowestPipelines = topSlow(
      samples.filter((s) => s.kind === "pipeline"),
      this.config.slowPipelineThresholdMs
    );
    const slowestEngines = topSlow(
      samples.filter((s) => s.kind === "engine"),
      this.config.slowEngineThresholdMs
    );

    if (slowestRules.length > 0) {
      warnings.push(`${slowestRules.length} slow rule(s) detected.`);
    }
    if (slowestPipelines.length > 0) {
      warnings.push(`${slowestPipelines.length} slow pipeline(s) detected.`);
    }

    const cacheRates = samples
      .map((s) => s.cacheHitRate)
      .filter((n): n is number => typeof n === "number");
    const averageHitRate =
      cacheRates.length === 0
        ? null
        : round2(cacheRates.reduce((a, b) => a + b, 0) / cacheRates.length);

    const executionTimeMs = round2(
      samples.reduce((sum, s) => sum + s.executionTimeMs, 0)
    );
    const cpuTimeMs = round2(samples.reduce((sum, s) => sum + s.cpuTimeMs, 0));
    const memoryUsageBytes = samples.reduce(
      (sum, s) => sum + s.memoryUsageBytes,
      0
    );
    const allocationCount = samples.reduce(
      (sum, s) => sum + s.allocationCount,
      0
    );

    return {
      profileId: createProfileId(),
      executionTimeMs,
      cpuTimeMs,
      memoryUsageBytes,
      allocationCount,
      cachePerformance: {
        averageHitRate,
        sampleCount: cacheRates.length,
      },
      slowestRules,
      slowestPipelines,
      slowestEngines,
      samples,
      warnings,
      errors,
      profilerEnabled: true,
    };
  }
}

function topSlow(samples: ProfileSample[], threshold: number): ProfileSample[] {
  return [...samples]
    .filter((s) => s.executionTimeMs >= threshold)
    .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
    .slice(0, 10);
}

function createProfileId(): string {
  return `prof:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
