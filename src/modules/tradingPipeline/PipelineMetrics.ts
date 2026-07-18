/**
 * Pipeline metrics tracker — Sprint 11B.2D.
 * Measures execution time, cache behaviour, and stage outcomes.
 */

import type {
  PipelineMetricsSnapshot,
  PipelineStageName,
  PipelineStageRecord,
  TradingPipelineResult,
} from "./TradingPipelineTypes";
import { PIPELINE_STAGE_ORDER } from "./TradingPipelineTypes";

function emptyStageDurations(): Record<PipelineStageName, number> {
  return {
    "Market Context": 0,
    "Market Regime": 0,
    Confidence: 0,
    Eligibility: 0,
  };
}

export function createEmptyPipelineMetrics(): PipelineMetricsSnapshot {
  return {
    executionTimeMs: 0,
    engineTimeMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
    warnings: 0,
    errors: 0,
    skippedEngines: 0,
    successfulEngines: 0,
    failedEngines: 0,
    totalRuns: 0,
    lastRunAt: null,
    stageDurations: emptyStageDurations(),
  };
}

export class PipelineMetrics {
  private snapshot: PipelineMetricsSnapshot = createEmptyPipelineMetrics();

  getSnapshot(): PipelineMetricsSnapshot {
    return {
      ...this.snapshot,
      stageDurations: { ...this.snapshot.stageDurations },
    };
  }

  reset(): void {
    this.snapshot = createEmptyPipelineMetrics();
  }

  recordRun(result: TradingPipelineResult, fromCache: boolean): void {
    this.snapshot.totalRuns += 1;
    this.snapshot.lastRunAt = result.timestamp;
    this.snapshot.executionTimeMs = result.executionTime;
    this.snapshot.warnings += result.warnings.length;
    this.snapshot.errors += result.errors.length;

    if (fromCache) {
      this.snapshot.cacheHits += 1;
      this.snapshot.skippedEngines += PIPELINE_STAGE_ORDER.length;
      return;
    }

    this.snapshot.cacheMisses += 1;
    this.applyStageRecords(result.stages);
  }

  recordCacheHit(): void {
    this.snapshot.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.snapshot.cacheMisses += 1;
  }

  private applyStageRecords(stages: PipelineStageRecord[]): void {
    let engineTime = 0;
    for (const stage of stages) {
      this.snapshot.stageDurations[stage.stage] = stage.durationMs;
      engineTime += stage.durationMs;

      if (stage.status === "success") {
        this.snapshot.successfulEngines += 1;
      } else if (stage.status === "failed") {
        this.snapshot.failedEngines += 1;
      } else if (stage.status === "skipped" || stage.status === "cached") {
        this.snapshot.skippedEngines += 1;
      }

      if (stage.cacheHit) {
        this.snapshot.cacheHits += 1;
      }
    }
    this.snapshot.engineTimeMs = engineTime;
  }
}

export function summarizeStageMetrics(
  stages: PipelineStageRecord[]
): Pick<
  PipelineMetricsSnapshot,
  "successfulEngines" | "failedEngines" | "skippedEngines" | "engineTimeMs"
> {
  let successfulEngines = 0;
  let failedEngines = 0;
  let skippedEngines = 0;
  let engineTimeMs = 0;

  for (const stage of stages) {
    engineTimeMs += stage.durationMs;
    if (stage.status === "success") successfulEngines += 1;
    else if (stage.status === "failed") failedEngines += 1;
    else if (stage.status === "skipped" || stage.status === "cached") {
      skippedEngines += 1;
    }
  }

  return { successfulEngines, failedEngines, skippedEngines, engineTimeMs };
}
