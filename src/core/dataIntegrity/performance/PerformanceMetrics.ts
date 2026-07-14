/**
 * Operational metrics for the performance engine.
 */

export interface PerformanceHealthScore {
  latency: number;
  throughput: number;
  resourceEfficiency: number;
  scalability: number;
  capacityPlanning: number;
  regressionStability: number;
  overall: number;
}

export interface PerformanceOperationalMetrics {
  latencyMs: number;
  throughputPerSec: number;
  capacity: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  benchmarks: number;
  performanceHealthScore: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class PerformanceMetricsTracker {
  private latencyMs = 0;
  private throughputPerSec = 0;
  private capacity = 0;
  private cpuUsagePct = 0;
  private memoryUsagePct = 0;
  private benchmarks = 0;
  private performanceHealthScore = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordBenchmark(input: {
    latencyMs: number;
    throughputPerSec: number;
    capacity: number;
    cpuUsagePct: number;
    memoryUsagePct: number;
    healthScore: number;
    runtimeMs: number;
  }): void {
    this.benchmarks += 1;
    this.latencyMs = input.latencyMs;
    this.throughputPerSec = input.throughputPerSec;
    this.capacity = input.capacity;
    this.cpuUsagePct = input.cpuUsagePct;
    this.memoryUsagePct = input.memoryUsagePct;
    this.performanceHealthScore = input.healthScore;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.performanceHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): PerformanceOperationalMetrics {
    return {
      latencyMs: this.latencyMs,
      throughputPerSec: this.throughputPerSec,
      capacity: this.capacity,
      cpuUsagePct: this.cpuUsagePct,
      memoryUsagePct: this.memoryUsagePct,
      benchmarks: this.benchmarks,
      performanceHealthScore: this.performanceHealthScore,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.latencyMs = 0;
    this.throughputPerSec = 0;
    this.capacity = 0;
    this.cpuUsagePct = 0;
    this.memoryUsagePct = 0;
    this.benchmarks = 0;
    this.performanceHealthScore = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
