/**
 * Throughput analyzer — validations/rules/batch/pipeline rates and concurrency.
 */

export interface ThroughputAnalysis {
  validationsPerSec: number;
  rulesPerSec: number;
  batchPerSec: number;
  pipelinePerSec: number;
  concurrentRequests: number;
  peakThroughput: number;
  score: number;
}

export class ThroughputAnalyzer {
  analyze(input: {
    completedOps: number;
    durationMs: number;
    rulesPerValidation?: number;
    batchSize?: number;
    pipelineStages?: number;
    concurrency: number;
    peakObserved?: number;
    targetThroughputPerSec: number;
  }): ThroughputAnalysis {
    const durationSec = Math.max(input.durationMs, 1) / 1000;
    const validationsPerSec = round2(input.completedOps / durationSec);
    const rulesPerValidation = Math.max(1, input.rulesPerValidation ?? 8);
    const batchSize = Math.max(1, input.batchSize ?? 10);
    const pipelineStages = Math.max(1, input.pipelineStages ?? 4);

    const rulesPerSec = round2(validationsPerSec * rulesPerValidation);
    const batchPerSec = round2(validationsPerSec / batchSize);
    const pipelinePerSec = round2(validationsPerSec / pipelineStages);
    const peakThroughput = round2(
      Math.max(input.peakObserved ?? 0, validationsPerSec * 1.15)
    );

    const target = Math.max(1, input.targetThroughputPerSec);
    const ratio = validationsPerSec / target;
    const score = clamp(Math.round(Math.min(100, ratio * 100)), 0, 100);

    return {
      validationsPerSec,
      rulesPerSec,
      batchPerSec,
      pipelinePerSec,
      concurrentRequests: input.concurrency,
      peakThroughput,
      score,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
