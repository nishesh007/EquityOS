/**
 * Metrics collector — throughput, latency, rates, health/trust/integrity trends.
 */

import type { TelemetrySample } from "./TelemetryRegistry";

export interface MetricsSnapshot {
  throughput: number;
  latencyMs: number;
  averageRuntimeMs: number;
  peakRuntimeMs: number;
  errorRate: number;
  warningRate: number;
  successRate: number;
  availability: number;
  healthScore: number;
  trustScoreTrend: number | null;
  integrityScoreTrend: number | null;
  sampleCount: number;
  collectedAt: string;
}

export class MetricsCollector {
  private readonly trustHistory: number[] = [];
  private readonly integrityHistory: number[] = [];
  private collectedMetrics = 0;

  collect(samples: TelemetrySample[]): {
    metrics: MetricsSnapshot;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const runtimes = samples.map(
        (s) => s.executionTimeMs ?? s.latencyMs ?? s.peakRuntimeMs ?? 0
      );
      const averageRuntimeMs =
        runtimes.length === 0
          ? 0
          : runtimes.reduce((a, b) => a + b, 0) / runtimes.length;
      const peakRuntimeMs = runtimes.length === 0 ? 0 : Math.max(...runtimes);
      const latencyMs =
        samples.reduce((s, x) => s + (x.latencyMs ?? x.executionTimeMs ?? 0), 0) /
        Math.max(1, samples.length);

      const requests = samples.reduce(
        (s, x) => s + (x.validationRequests ?? x.pipelineExecutions ?? 0),
        0
      );
      const failures = samples.reduce((s, x) => s + (x.failures ?? 0), 0);
      const warningsCount = samples.reduce((s, x) => s + (x.warnings ?? 0), 0);
      const throughput =
        samples.reduce((s, x) => s + (x.throughput ?? 0), 0) || requests;

      const errorRate =
        samples.some((s) => s.errorRate != null)
          ? avg(samples.map((s) => s.errorRate).filter((n): n is number => n != null))
          : requests === 0
            ? 0
            : (failures / Math.max(1, requests)) * 100;

      const warningRate =
        samples.some((s) => s.warningRate != null)
          ? avg(
              samples
                .map((s) => s.warningRate)
                .filter((n): n is number => n != null)
            )
          : requests === 0
            ? 0
            : (warningsCount / Math.max(1, requests)) * 100;

      const successRate =
        samples.some((s) => s.successRate != null)
          ? avg(
              samples
                .map((s) => s.successRate)
                .filter((n): n is number => n != null)
            )
          : clamp(100 - errorRate, 0, 100);

      const availability =
        samples.some((s) => s.availability != null)
          ? avg(
              samples
                .map((s) => s.availability)
                .filter((n): n is number => n != null)
            )
          : successRate;

      const healthScore =
        samples.some((s) => s.healthScore != null)
          ? avg(
              samples
                .map((s) => s.healthScore)
                .filter((n): n is number => n != null)
            )
          : availability;

      for (const s of samples) {
        if (s.trustScore != null) this.trustHistory.push(s.trustScore);
        if (s.integrityScore != null)
          this.integrityHistory.push(s.integrityScore);
      }
      if (this.trustHistory.length > 100) {
        this.trustHistory.splice(0, this.trustHistory.length - 100);
      }
      if (this.integrityHistory.length > 100) {
        this.integrityHistory.splice(0, this.integrityHistory.length - 100);
      }

      this.collectedMetrics += 1;
      return {
        metrics: {
          throughput: round2(throughput),
          latencyMs: round2(latencyMs),
          averageRuntimeMs: round2(averageRuntimeMs),
          peakRuntimeMs: round2(peakRuntimeMs),
          errorRate: round2(errorRate),
          warningRate: round2(warningRate),
          successRate: round2(successRate),
          availability: round2(availability),
          healthScore: round2(healthScore),
          trustScoreTrend: trend(this.trustHistory),
          integrityScoreTrend: trend(this.integrityHistory),
          sampleCount: samples.length,
          collectedAt: new Date().toISOString(),
        },
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Metrics collection failed: ${String(err)}`);
      return {
        metrics: emptyMetrics(),
        warnings,
        errors,
      };
    }
  }

  getCollectedCount(): number {
    return this.collectedMetrics;
  }

  reset(): void {
    this.collectedMetrics = 0;
    this.trustHistory.length = 0;
    this.integrityHistory.length = 0;
  }
}

function emptyMetrics(): MetricsSnapshot {
  return {
    throughput: 0,
    latencyMs: 0,
    averageRuntimeMs: 0,
    peakRuntimeMs: 0,
    errorRate: 0,
    warningRate: 0,
    successRate: 100,
    availability: 100,
    healthScore: 100,
    trustScoreTrend: null,
    integrityScoreTrend: null,
    sampleCount: 0,
    collectedAt: new Date().toISOString(),
  };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trend(history: number[]): number | null {
  if (history.length < 2) return history.length === 1 ? 0 : null;
  const recent = history.slice(-5);
  return round2(recent[recent.length - 1]! - recent[0]!);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
