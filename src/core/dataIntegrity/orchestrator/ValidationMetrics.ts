/**
 * Orchestrator operational metrics.
 */

export interface OrchestratorMetricsSnapshot {
  requests: number;
  averageExecutionTime: number;
  averagePipelineTime: number;
  cacheHitRatio: number;
  cacheMissRatio: number;
  engineUtilization: Record<string, number>;
  pipelineUtilization: Record<string, number>;
  failureRate: number;
  completed: number;
  failed: number;
  cancelled: number;
  timedOut: number;
}

export class ValidationMetricsTracker {
  private requests = 0;
  private completed = 0;
  private failed = 0;
  private cancelled = 0;
  private timedOut = 0;
  private executionTimeSum = 0;
  private pipelineTimeSum = 0;
  private pipelineCount = 0;
  private cacheHitRatio = 0;
  private cacheMissRatio = 0;
  private readonly engineUtilization: Record<string, number> = {};
  private readonly pipelineUtilization: Record<string, number> = {};

  recordRequest(input: {
    executionTimeMs: number;
    pipelineTimeMs?: number;
    pipelineId?: string;
    engines: string[];
    outcome: "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT";
    cacheHitRatio: number;
    cacheMissRatio: number;
  }): void {
    this.requests += 1;
    this.executionTimeSum += input.executionTimeMs;
    this.cacheHitRatio = input.cacheHitRatio;
    this.cacheMissRatio = input.cacheMissRatio;

    if (input.pipelineTimeMs !== undefined) {
      this.pipelineTimeSum += input.pipelineTimeMs;
      this.pipelineCount += 1;
    }
    if (input.pipelineId) {
      this.pipelineUtilization[input.pipelineId] =
        (this.pipelineUtilization[input.pipelineId] ?? 0) + 1;
    }
    for (const engine of input.engines) {
      this.engineUtilization[engine] =
        (this.engineUtilization[engine] ?? 0) + 1;
    }

    switch (input.outcome) {
      case "COMPLETED":
        this.completed += 1;
        break;
      case "FAILED":
        this.failed += 1;
        break;
      case "CANCELLED":
        this.cancelled += 1;
        break;
      case "TIMED_OUT":
        this.timedOut += 1;
        break;
    }
  }

  getMetrics(): OrchestratorMetricsSnapshot {
    const finished = this.completed + this.failed + this.cancelled + this.timedOut;
    return {
      requests: this.requests,
      averageExecutionTime:
        this.requests === 0
          ? 0
          : round2(this.executionTimeSum / this.requests),
      averagePipelineTime:
        this.pipelineCount === 0
          ? 0
          : round2(this.pipelineTimeSum / this.pipelineCount),
      cacheHitRatio: this.cacheHitRatio,
      cacheMissRatio: this.cacheMissRatio,
      engineUtilization: { ...this.engineUtilization },
      pipelineUtilization: { ...this.pipelineUtilization },
      failureRate:
        finished === 0
          ? 0
          : round2((this.failed / finished) * 100),
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
      timedOut: this.timedOut,
    };
  }

  reset(): void {
    this.requests = 0;
    this.completed = 0;
    this.failed = 0;
    this.cancelled = 0;
    this.timedOut = 0;
    this.executionTimeSum = 0;
    this.pipelineTimeSum = 0;
    this.pipelineCount = 0;
    this.cacheHitRatio = 0;
    this.cacheMissRatio = 0;
    for (const key of Object.keys(this.engineUtilization)) {
      delete this.engineUtilization[key];
    }
    for (const key of Object.keys(this.pipelineUtilization)) {
      delete this.pipelineUtilization[key];
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
