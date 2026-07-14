/**
 * Operational metrics for the diagnostics engine.
 */

export interface DiagnosticsOperationalMetrics {
  diagnosticsRuns: number;
  averageRuntime: number;
  lastRuntime: number;
  profilerRuntime: number;
  averageProfilerRuntime: number;
  traceCount: number;
  healthScore: number;
  snapshotCount: number;
  memoryUsage: number;
  lastRunAt: string | null;
}

export class DiagnosticsMetricsTracker {
  private diagnosticsRuns = 0;
  private runtimeSum = 0;
  private lastRuntime = 0;
  private profilerRuntimeSum = 0;
  private profilerRuns = 0;
  private lastProfilerRuntime = 0;
  private traceCount = 0;
  private healthScore = 0;
  private snapshotCount = 0;
  private memoryUsage = 0;
  private lastRunAt: string | null = null;

  recordRun(input: {
    runtimeMs: number;
    healthScore: number;
    memoryUsageBytes?: number;
  }): void {
    this.diagnosticsRuns += 1;
    this.runtimeSum += input.runtimeMs;
    this.lastRuntime = input.runtimeMs;
    this.healthScore = input.healthScore;
    if (input.memoryUsageBytes != null) {
      this.memoryUsage = input.memoryUsageBytes;
    }
    this.lastRunAt = new Date().toISOString();
  }

  recordProfiler(runtimeMs: number): void {
    this.profilerRuns += 1;
    this.profilerRuntimeSum += runtimeMs;
    this.lastProfilerRuntime = runtimeMs;
  }

  setTraceCount(n: number): void {
    this.traceCount = n;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): DiagnosticsOperationalMetrics {
    return {
      diagnosticsRuns: this.diagnosticsRuns,
      averageRuntime:
        this.diagnosticsRuns === 0
          ? 0
          : round2(this.runtimeSum / this.diagnosticsRuns),
      lastRuntime: this.lastRuntime,
      profilerRuntime: this.lastProfilerRuntime,
      averageProfilerRuntime:
        this.profilerRuns === 0
          ? 0
          : round2(this.profilerRuntimeSum / this.profilerRuns),
      traceCount: this.traceCount,
      healthScore: this.healthScore,
      snapshotCount: this.snapshotCount,
      memoryUsage: this.memoryUsage,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.diagnosticsRuns = 0;
    this.runtimeSum = 0;
    this.lastRuntime = 0;
    this.profilerRuntimeSum = 0;
    this.profilerRuns = 0;
    this.lastProfilerRuntime = 0;
    this.traceCount = 0;
    this.healthScore = 0;
    this.snapshotCount = 0;
    this.memoryUsage = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
